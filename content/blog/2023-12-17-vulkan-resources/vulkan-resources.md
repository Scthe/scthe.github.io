---
title: "Vulkan resources"
permalink: "/blog/vulkan-resources/"
excerpt: "Explanation of memory allocation in Vulkan. Walkthrough VBuffer and VkImage options and usages."
date: 2023-12-17 12:00:00
image: "./layout-preinitialized-required.png"
draft: false
---



In this article we will look at two most basic resources that you will use in Vulkan: [VkBuffer](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBuffer.html) and [VkImage](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImage.html). We will start with AMD's Vulkan Memory Allocator. It's a library used to simplify managing memory allocations. It still offers enough features to make meaningful decissions. We will see how to upload the to the GPU and make it efficient. As we will see, a lot of choices are based on the usage patterns. Finally, `VkImage` can be used as framebuffer attachment, 3D object texture or a sampled image (raw data). Each scenario has different requirements and constraints. We will also explain image tiling and layouts.

This article heavily build on the previous [Vulkan synchronization](/blog/vulkan-synchronization/). Read it to understand concepts like pipeline barriers, memory dependencies, frames in flight, etc.



## Using AMD's VulkanMemoryAllocator


To create `VmaAllocator` use [vmaCreateAllocator()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__init.html#ga200692051ddb34240248234f5f4c17bb). Basic allocator requires just a `VkInstance`, `VkPhysicalDevice` and `VkDevice`. There are also:

* `uint32_t vulkanApiVersion`. Same Vulkan version you have provided to `vkCreateInstance()`.
* `VmaAllocatorCreateFlags flags`. Used to allow VMA to use [specified](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__init.html#ga4f87c9100d154a65a4ad495f7763cf7c), memory-related [device extensions](/blog/vulkan-initialization/).
* `VkDeviceSize preferredLargeHeapBlockSize`. VMA allocates memory in blocks. Set preferred block size. Usually leave at default 256 MB.
* `VkAllocationCallbacks* pAllocationCallbacks`. Allows you to intercept all allocations and assign the **CPU**(!) memory yourself. I don't think it's possible to use this field to allocate GPU memory. Still it's probably nice for debug.
* `VmaDeviceMemoryCallbacks* pDeviceMemoryCallbacks`. [Callbacks](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/struct_vma_device_memory_callbacks.html) for `pfnAllocate()` and `pfnFree()`. Both functions return `void` and are only for logging purposes.
* `VkDeviceSize* pHeapSizeLimit`. Array of `VkPhysicalDeviceMemoryProperties::memoryHeapCount` values that limit the maximum number of bytes allocated from each heap. Allocation may fail with `VK_ERROR_OUT_OF_DEVICE_MEMORY` if there is no memory avialable on selected heap. Usually leave `NULL`.
* `VkExternalMemoryHandleTypeFlagsKHR* pTypeExternalMemoryHandleTypes`. Used with Vulkan's [VkExportMemoryAllocateInfoKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkExportMemoryAllocateInfoKHR.html).

The received `VmaAllocator` object is used to allocate memory using following functions:

* [vmaCreateBuffer()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gac72ee55598617e8eecca384e746bab51). Takes `VmaAllocator`, `VkBufferCreateInfo` and `VmaAllocationCreateInfo` as parameters.
* [vmaCreateImage()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#ga02a94f25679275851a53e82eacbcfc73). Takes `VmaAllocator`, `VkImageCreateInfo` and `VmaAllocationCreateInfo` as parameters.

We will investigate `VkBufferCreateInfo` and `VkImageCreateInfo` in more details later in this article. AMD has a separate [VMA docs page](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/choosing_memory_type.html) explaining `AllocationCreateInfo`. Fields like `memory_type_bits`, [pool](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/custom_memory_pools.html) and `priority` can be safely ignored. `pUserData` can be used to add custom data to an allocation. Used to track memory leaks. The `VmaMemoryUsage`, `VmaAllocationCreateFlags` and `VkMemoryPropertyFlags` fields is where most of the decisions are made.



### VmaAllocationCreateInfo: VmaMemoryUsage

Since VMA version 3.0.0 [VMA_MEMORY_USAGE_*](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gaa5846affa1e9da3800e3e78fae2305cc) has only 3 values: `VMA_MEMORY_USAGE_AUTO` (AMD strongly suggests to use this option), `VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE` (GPU memory) and `VMA_MEMORY_USAGE_AUTO_PREFER_HOST` (CPU memory). This values are mostly a hints, as `VmaAllocationCreateFlagBits` have a huge impact too - mainly if the buffer is mappable (to easier write from CPU).

> There is also `VMA_MEMORY_USAGE_GPU_LAZILY_ALLOCATED` but documentation says it's mostly for mobile devices. I assume it's an option for tiled renderers when attachment values do not have to be written into persisted memory. Instead, next subpass would just use them as 'local' values. But that's just my guess.



### VmaAllocationCreateInfo: VmaAllocationCreateFlags

There are many options for [flags](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gad9889c10c798b040d59c92f257cae597). Most of them refer to specific use case. Most common are:

* `VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT`. Used for image attachments that due to their size prefer own memory block.
* `VMA_ALLOCATION_CREATE_MAPPED_BIT`. Persistently mapped memory. According to documentation, there are usually 2 possibilities:
    * sequential access:
        * `VmaAllocationCreateInfo.flags`: `VMA_ALLOCATION_CREATE_MAPPED_BIT | VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT`,
        * `VmaAllocationCreateInfo.required_flags`: `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT`,
    * random access:
        * `VmaAllocationCreateInfo.flags`: `VMA_ALLOCATION_CREATE_MAPPED_BIT | VMA_ALLOCATION_CREATE_HOST_ACCESS_RANDOM_BIT`,
        * `VmaAllocationCreateInfo.required_flags`: `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_CACHED_BIT`.

Flags for persistently mapped memory might seem convoluted. Usually, to write the memory from the CPU you will use sequential access. In practice not all mentioned flags seem to be required. Even AMD does not manually set `required_flags` (see below). There are a few other flags that specify e.g. what to do if device runs out of memory.



### VmaAllocationCreateInfo: `required_flags` and `preferred_flags`

`required_flags` force certain behaviour and should be avoided - especially if you already specified `flags`. `preferred_flags` are just hints. Usually `VMA` can deduce optimal values for both of this fields by itself based on `flags`. The values are based on Vulkan's [VkMemoryPropertyFlagBits](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkMemoryPropertyFlagBits.html):

* `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`. Memory should be allocated on GPU, and is usually not accessible from CPU. Preferred for:
    * image attachments,
    * compute buffers,
    * static 3D object's textures and buffers,
    * basically everything that rarely changes and favours fast access.
* `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT`. Make memory visible from host.
* `VK_MEMORY_PROPERTY_HOST_COHERENT_BIT`. Alleviates need to call `vkFlushMappedMemoryRanges` or `vkInvalidateMappedMemoryRanges` after each CPU write to mapped memory (so assures [avalability](/blog/vulkan-synchronization)). Does not guarantee `visibility`.
* `VK_MEMORY_PROPERTY_HOST_CACHED_BIT`. Create cache version of the memory on the host for faster access. I'm not sure how this flag works with `VK_MEMORY_PROPERTY_HOST_COHERENT_BIT`. If I wanted both, I would set them in `preferred_flags`. There is [stackoverflow thread](https://stackoverflow.com/questions/45017121/are-host-cached-bit-and-host-coherent-bit-contradicting-each-other) where someone else noticed this issue.

Both `required_flags` and `preferred_flags` are masks, so you can `OR` the bits. Popular libarary ["gpu-allocator" by Traverse-Research](https://github.com/Traverse-Research/gpu-allocator) differentiates following use cases to determine `preferred_flags`:

* `MemoryLocation::GpuOnly` (`VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`),
* `MemoryLocation::CpuToGpu` (`VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`). Coherent host visible memory is ideal for mapped memory. All modern GPU have about 256MB acessible from CPU with very little performace penalty (`VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`). This is known as `Base Address Register (BAR)`.
* `MemoryLocation::GpuToCpu` (`VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_CACHED_BIT`). Fast read access from CPU to cached memory.


Worth mentioning that if we only set `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT` the memory can be allocated on the host (CPU), so GPU reads would require PCI-express bus transfer.

> For more information about `Base Address Register (BAR)` and `Smart Access Memory (SAM)` I recommend Adam Sawicki's ["Vulkan Memory Types on PC and How to Use Them"](https://asawicki.info/news_1740_vulkan_memory_types_on_pc_and_how_to_use_them). He works for AMD and is one of the VMA creators.



### VMA allocations in practice

Fortunately, VMA documentation comes with [usage samples](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/usage_patterns.html). We can notice that `VmaAllocationCreateInfo.usage` is always `VMA_MEMORY_USAGE_AUTO` and no `required_flags`/`preferred_flags` are set. This means that only `flags` are used to determine the final memory allocation placement:

* `VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT`. Heavly used, GPU-only resources. Like image attachments, compute buffers, static 3D object's textures and buffers. You can query for [VkMemoryDedicatedRequirementsKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkMemoryDedicatedRequirementsKHR.html). This only acts as a hint to a driver.
* `VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT`. Temporary staging buffer that CPU will write to. It's content will be then copied to GPU-only resource. For all we know, this temporary allocation may end up either in CPU's RAM or GPU's `Base Address Register`. This pattern is needed as memory allocated with `VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT` may have to sacrifice performance in order for CPU to write to it. It disables certain optimization that the driver might normally do.
* `VMA_ALLOCATION_CREATE_HOST_ACCESS_RANDOM_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT`. Mapped memory when you want to read on CPU values from GPU.

This documentation contains section dedicated to uniform buffers. They are often written from CPU at least once per frame, but are directly read from GPU. You can the have usage as `VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE` and flags as `VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT`. Our goal is to place it in the previously mentioned `Base Address Register`. Alternatively, `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT` has similar semantic.



### Mapping the memory

> You need to provide either `VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT` or `VMA_ALLOCATION_CREATE_HOST_ACCESS_RANDOM_BIT` in `flags` during allocation to be able to map the memory!

There are 2 common strategies to mapping memory in Vulkan: 1) map and unmap it at every use, or 2) do persistent mapping (map it once after allocation and unmap only when resource is deleted). Usually persistent mapping is preferred as `vkMapMemory()` can be expensive on some drivers. With VMA it's allowed to map memory multiple times as the library does the reference counting for us. This is **not** allowed in pure Vulkan. I can recommend Kyle Halladay's [Comparing Uniform Data Transfer Methods in Vulkan](https://kylehalladay.com/blog/tutorial/vulkan/2017/08/13/Vulkan-Uniform-Buffers.html) if you are wondering which approach is fastest.

Persistent mapping in VMA requires `VMA_ALLOCATION_CREATE_MAPPED_BIT`. Both `vmaCreateBuffer()` and `vmaCreateImage()` fill `VmaAllocationInfo.pMappedData` to which we can `memcpy()`. In Rust we have following code:


```rust
/// Wrapper over a raw pointer to make it moveable and accessible from other threads
pub struct MemoryMapPointer(pub *mut ::std::os::raw::c_void);
unsafe impl Send for MemoryMapPointer {}
unsafe impl Sync for MemoryMapPointer {}

pub fn get_persistently_mapped_pointer(
  allocator: &vma::Allocator,
  allocation: &vma::Allocation,
) -> Option<MemoryMapPointer> {
  let alloc_info = allocator.get_allocation_info(&allocation);
  let ptr = alloc_info.mapped_data;
  if ptr.is_null() {
    None
  } else {
    Some(MemoryMapPointer(ptr))
  }
}

fn write_to_mapped(
  allocator: &vma::Allocator,
  allocation: &vma::Allocation,
  bytes: &[u8]
) {
  let mapped_pointer = get_persistently_mapped_pointer(allocator, allocation);
  let size = bytes.len();

  if let Some(pointer) = mapped_pointer {
    let slice = unsafe { std::slice::from_raw_parts_mut(pointer.0 as *mut u8, size) };
    slice.copy_from_slice(bytes);
  } else {
    panic!("Tried to write {} bytes to unmapped memory", size)
  }
}
```

It does not matter if we are writing to memory allocated for `VkBuffer` or `VkImage`. For `VkBuffer` I would recommend to align memory to `vec4`. For `VkImage` check that image format of data is same as the one in `VkImage`. E.g. if you read from the hard drive an image that does not have alpha channel and write it to `vk::Format::R8G8B8A8_SRGB` you will receive garbage. The tiling **has** to be `vk::ImageTiling::LINEAR`. If you write bytes to venor/driver dependent `vk::ImageTiling::OPTIMAL` you will receive garbage. Yet, during runtime, it's recommended to use only `VkImages` with `vk::ImageTiling::OPTIMAL`. This means that you have to create an intermediary scratch buffer used only as a copy destination (from CPU) and then as a copy data source (data copied to final, optimal `VkImage`).


### Other VMA functionalities

While basic VMA usage is intuitive, I recommend to skim the docs. Other functionalites include:

* [defragmentation](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/defragmentation.html), 
* [corruption detection](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/debugging_memory_usage.html), 
* [custom memory pools](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/custom_memory_pools.html),
* [resource aliasing ](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/resource_aliasing.html).

The docs are very clear and have just enough examples. That's rare and worth pointing out.





## VkBuffer


[VkBuffer](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBuffer.html) represents continous array of bytes. Here is short example code to create and allocate `VkBuffer` using [ash](https://github.com/ash-rs/ash) and [vma](https://github.com/GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator):


```rust
let buffer_info = vk::BufferCreateInfo::builder()
  .size(size)
  .usage(usage)
  .sharing_mode(vk::SharingMode::EXCLUSIVE)
  .queue_family_indices(&[queue_family]);

#[allow(deprecated)]
let mut alloc_info = vma::AllocationCreateInfo {
  usage: vma::MemoryUsage::GpuOnly,
  ..Default::default()
};

let (buffer, allocation) = unsafe {
  allocator
    .create_buffer(&buffer_info, &alloc_info)
    .expect(&format!("Failed allocating VkBuffer of size: {}", size))
};
```

In raw Vulkan you would use [vkCreateBuffer()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateBuffer.html) with [VkBufferCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBufferCreateInfo.html). After that, use [vkAllocateMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAllocateMemory.html) and [vkBindBufferMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkBindBufferMemory.html) to assign memory to the buffer. With VMA, use [vmaCreateBuffer()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gac72ee55598617e8eecca384e746bab51) (takes `VkBufferCreateInfo` and `AllocationCreateInfo` as parameters). In C++ also requires pointers to `VkBuffer*`, `VmaAllocation*` and `VmaAllocationInfo*` structs that will be filled with result data. In Rust, the this is returned as a tuple `(ash::vk::Buffer, vma::Allocation)`. Since we've already dicusssed `AllocationCreateInfo`, let's look at `VkBuffer` creation parameters.

At first glance [VkBufferCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBufferCreateInfo.html) may seem complicated. For basic usage, following properties can be ignored:

* [VkBufferCreateFlags flags](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBufferCreateFlagBits.html). Just nothing interesting there.
* [VkSharingMode sharingMode](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSharingMode.html). Usually `EXCLUSIVE` unless you need to use the buffer on multiple `queue families`.
* `uint32_t* queue_family_indices`. You've selected a `queue family` after calling [vkGetPhysicalDeviceQueueFamilyProperties](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html), provide it here too. You can also ignore this setting due to `EXCLUSIVE` sharing mode.

> In [Vulkan initialization](/blog/vulkan-initialization/) we selected 1 `queue family` and created 1 `VkQueue` object. If you have many `queue families` the situation is more complicated. Remember that even for a single `queue family` we can have many `queues`.

Last 2 parameters in `VkBufferCreateInfo` are `size` (in bytes) and `VkBufferUsageFlags usage`. Usage refers to if it's an index, vertex, uniform, storage (SSBO) buffer, etc. This field is a mask, which means that we can provide many usages for a single buffer. This is especially important if we want to use transfer operations. To fill the buffer from the CPU, you need to set `usage` to `VK_BUFFER_USAGE_TRANSFER_DST_BIT | VK_BUFFER_USAGE_*`.  Unfortunately, GPU memory region that is visible and writeable from CPU usually has some drawbacks. 

> Uniform buffers objects (UBO) are read-only, while Shader Storage Buffer Objects (SSBO) can be both read and updated. In other words, UBO can be written only by host (CPU), while SSBO by both host and during shader execution. This can affect allocation properties that you assign.

> It's easy to forget to set proper `VkBufferUsageFlags`. The validation layer will inform you about this the moment the buffer is used in an unexpected way. As you can see, `VkBufferCreateInfo` is really quite simple.


### Using temporary buffers to upload data

As mentioned previously, not all memory allocated with `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT` is created equal. If this memory is also mapped to CPU, it may have worse preformance. But what if we have static data that 1) is written from CPU,  2) never changes, and 3) is read only from GPU? Good example are vertex and index buffers. The answer is to have a temporary buffer that serves as a middle man for data transfer. This buffer is deleted right after the copy operation.

```rust
  pub fn create_buffer_from_data(
    allocator: &vma::Allocator,
    with_setup_cb: &impl WithSetupCmdBuffer,
    bytes: &[u8],
    usage: vk::BufferUsageFlags,
  ) -> Self {
    let size = bytes.len();
    // create mapped temporary buffer using some util fn
    let mut (tmp_buf, tmp_buf_alloc) = allocate_buffer(
      allocator,
      size,
      vk::BufferUsageFlags::TRANSFER_SRC,
      vma::MemoryUsage::Auto, // don't care
      vma::AllocationCreateFlags::HOST_ACCESS_SEQUENTIAL_WRITE | vma::AllocationCreateFlags::MAPPED
    );
    // we defined this util fn in the section about mapping VMA memory
    write_to_mapped(allocator, tmp_buf_alloc, bytes);

    // create final buffer
    let (buf, buf_alloc) = allocate_buffer(
      allocator,
      size,
      usage | vk::BufferUsageFlags::TRANSFER_DST,
      vma::MemoryUsage::AutoPreferDevice,
      vma::AllocationCreateFlags::empty()
    );
    // transfer the content
    with_setup_cb.with_setup_cb(|device, cmd_buf| unsafe {
      let mem_region = ash::vk::BufferCopy::builder()
        .dst_offset(0)
        .src_offset(0)
        .size(size as u64)
        .build();
      device.cmd_copy_buffer(cmd_buf, tmp_buf, buf, &[mem_region]);
    });

    // cleanup tmp buffer
    allocator.destroy_buffer(tmp_buf, &mut tmp_buf_alloc)
    (buf, buf_alloc)
  }
```

First we allocate presistently mapped temporary buffer that we will use as 1) transfer destination (from CPU) and 2) transfer source (to final buffer). We write our data into it. Create the final buffer on GPU and with special `vk::BufferUsageFlags::TRANSFER_DST` usage flag. To copy data between the buffers we need to use [vkCmdCopyBuffer](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdCopyBuffer.html). Unfortunately, since it is a Vulkan command, it requires a command buffer. Vulkan applications often create special command buffer for setup operations like this. You can find one in [EmbarkStudios' kajiya](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-backend/src/vulkan/device.rs#L554). In `Rust-Vulkan-TressFX` I've created trait `WithSetupCmdBuffer` that requires `fn with_setup_cb(&self, callback: impl FnOnce(&ash::Device, vk::CommandBuffer));`. It is [implemented](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/src/vk_ctx/vk_ctx.rs#L124) by `VkCtx`, which is my version of kajiya's `Device`. The rest of the implementation is contained in [execute_setup_cmd_buf](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/src/vk_utils/setup_cmd_buf.rs#L8) that takes care of `vkBeginCommandBuffer()`, `vkEndCommandBuffer()` and `vkQueueSubmit()`. It should also cover synchronization, as we will destroy the temporary buffer right after transfer is finished.



### Writing to uniform buffers

Let's assume this is our uniform buffer object in GLSL:

```c
layout(binding = 0) 
uniform GlobalConfigUniformBuffer {
  vec4 u_cameraPosition; // [cameraPosition.xyz, -]
  vec4 u_viewportAndNearFar; // [viewport.w,viewport.h, near,far]
  mat4 u_viewMat;
  mat4 u_projectionMat;
}
```

How can a CPU write to the GPU-placed buffer so that all values are received correctly? The biggest problem is always alignment. If the first member of the UBO structure were `vec3`, what would be the byte offset of the second member? In OpenGL this type of problems [lead to huge headache](https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Memory_layout). I strongly recommend to always round up values to `vec4` (instead of `vec3`). At the very least, make sure that if you have members of type `float`, they are declared 4 right after one another. I've also had a few issues with mixing in random `int`s between other members. You can [preview uniform values in RenderDoc](/blog/debugging-vulkan-using-renderdoc/).



<Figure>
  <BlogImage
    src="./opengl_wiki_buffer_layouts.png"
    alt="Description for diferent GLSL blocks memory layouts. Warning to never use vec3 in std140 has a red border."
  />
  <Figcaption>

GLSL blocks memory layouts are complicated. If you ever used them, you probably know why I've added red border to the warning. Screen from OpenGL wiki [Memory_layout](https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Memory_layout).

  </Figcaption>
</Figure>



Here is how the same uniform block is expressed in Rust:

```rust
use bytemuck;
use glam::{vec4, Mat4, Vec2, Vec3, Vec4};

#[derive(Copy, Clone, Debug)]
#[repr(C)]
pub struct GlobalConfigUBO  {
  pub u_camera_position: Vec4,
  pub u_viewport_and_near_far: Vec4,
  pub u_view_mat: Mat4,
  pub u_projection_mat: Mat4,
}
unsafe impl bytemuck::Zeroable for GlobalConfigUBO  {}
unsafe impl bytemuck::Pod for GlobalConfigUBO  {}

impl GlobalConfigUBO {
  /// Pack into the struct.
  /// Encapsulates all the alignments etc.
  pub fn new(
    cam_pos: Vec3, // vec3 warning!
    vp_size: Vec2,
    near_far: Vec2,
    view_mat: Mat4,
    projection_mat: Mat4,
  ) -> Self {
    Self {
      u_camera_position: vec4(cam_pos.x, cam_pos.y, cam_pos.z, 0),
      u_viewport_and_near_far: vec4(vp_size.x, vp_size.y, near_far.x, near_far.y),
      u_view_mat: view_mat,
      u_projection_mat: projection_mat,
    }
  }

  pub fn write_to_gpu(
    &self, allocator: &vma::Allocator, allocation: &vma::Allocation
  ) {
    let data_bytes = bytemuck::bytes_of(self);
    // we defined this util fn in the section about mapping VMA memory
    write_to_mapped(allocator, allocation, data_bytes);
  }
}
```


Examples from my Rust-Vulkan-TressFX project:

* `GlobalConfigUniformBuffer` UBO that contains all global data (camera position, viewport size, settings from UI, etc.):
  * [GLSL shader uniform](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/assets/shaders/_config_ubo.glsl)
  * [Rust GlobalConfigUBO](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/src/render_graph/_shared/global_config_ubo.rs)
* Forward rendering, per-object UBO:
  * [GLSL shader uniform](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/assets/shaders/_forward_model_ubo.glsl)
  * [Rust ForwardModelUBO](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/src/render_graph/_shared/forward_model_ubo.rs)
* `TfxParamsUniformBuffer`, UBO that contains hair material data
  * [GLSL shader uniform](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/assets/shaders/tfx_render/_tfx_params_ubo.glsl)
  * [Rust TfxParamsUBO](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/master/src/render_graph/_shared/tfx_params_ubo.rs)


In the [next article](#) we will see how to actually bind the `VkBuffer` objects to GLSL descriptors.




## VkImage

Creating [VkImage]((https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImage.html)) takes a familiar shape to any other Vulkan object. We call `vkCreateImage()` with `VkImageCreateInfo` struct. Then we call same 2 functions as we have used with `VkBuffers` ([vkAllocateMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAllocateMemory.html), [vkBindBufferMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkBindBufferMemory.html)) to allocate and bind the memory.

With VMA, we just provide `VkImageCreateInfo` and `vma::AllocationCreateInfo` to [vmaCreateImage()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#ga02a94f25679275851a53e82eacbcfc73).

Unfortunately, to understand `VkImageCreateInfo`, we have to walk through a few other concepts before.



### Miscellaneous `VkImageCreateInfo` parameters

Let's start with the fields that require little explanation. If you've used and graphic API before, you are probably familiar with `mipLevels`, multipsampling. As with `VkBuffer`, we can also specify `VkSharingMode` and `queue_family_indices`. Here are such 'miscellaneous' fields:

* [VkImageCreateFlags flags](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageCreateFlagBits.html). Nothing terribly useful, although `VK_IMAGE_CREATE_CUBE_COMPATIBLE_BIT` is mandatory for cubemaps.
* [uint32_t mipLevels](https://en.wikipedia.org/wiki/Mipmap). Used to declare mipmaps. Alexander Overvoorde's Vulkan Tutorial has entire [chapter dedicated to adding mipmaps](https://vulkan-tutorial.com/Generating_Mipmaps). 
* [VkSampleCountFlagBits samples](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSampleCountFlagBits.html). Used for [multisample anti-aliasing](https://en.wikipedia.org/wiki/Multisample_anti-aliasing). Alexander Overvoorde's Vulkan Tutorial has entire [chapter dedicated to multisampling](https://vulkan-tutorial.com/Multisampling). Unfortunately it's not as simple as just setting a `samples` flag. This information is also required when defining `VkRenderPass` attachments. The multisampling resolve is declared in subpass definition: [VkSubpassDescription.pResolveAttachments](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSubpassDescription.html).
* [VkSharingMode sharingMode](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSharingMode.html). Usually `EXCLUSIVE` unless you need to use the image on multiple queue families,
* `uint32_t* queue_family_indices`. You've selected a queue family after calling [vkGetPhysicalDeviceQueueFamilyProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html), provide it here too. You can also ignore this setting due to `EXCLUSIVE` sharing mode.




### Image texel count: `imageType`, `extent`, `arrayLayers`

When you think of an image you usually imagine a 2D collection of pixels. In Vulkan, an image can have a following [VkImageTypes](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageType.html):

* 1D - a single row,
* 2D - width and height,
* 3D - width, height and depth (imagine voxels in 3D space).
 
Dimensions are provided in [VkExtent3D](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkExtent3D.html) struct. Unused dimensions should be set to 1. The extent declares the size of mipmap at level 0.

Array layers allow to embed many images inside a single `VkImage`. Imagine Minecraft, where different blocks have different material (like wood, stone, gold or glass). Each material has a texture of same size. Instead of having separate `VkImage` for each material type, we can create a single `VkImage` with array layers. Each layer contains texture data for 1 material. In shader we use GLSL's `vec4 texture(sampler2DArray sampler, vec3 P);` to select which layer to sample. At least 1 layer is always required.

Let's look at an example cubemap declaration:

* `flags` is `VK_IMAGE_CREATE_CUBE_COMPATIBLE_BIT`,
* `imageType` is `VK_IMAGE_TYPE_2D`,
* `extent` is `{ cubeMap.width, cubeMap.height, 1 }`,
* `arrayLayers` has to be 6 - one for each side. Cubemap is an image with 6 different 2D layers.

Full cubemap example can be found in [Sascha Willems' Vulkan examples](https://github.com/SaschaWillems/Vulkan/blob/3c0f3e18cdee7aa67e5e9198b76a24985bb49391/examples/texturecubemap/texturecubemap.cpp#L160) repo. It requires e.g. special `VkImageView` with `imageType=VK_IMAGE_VIEW_TYPE_CUBE`.


> Remember that [VkImageMemoryBarrier2](/blog/vulkan-synchronization/) contains [VkImageSubresourceRange](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageSubresourceRange.html) which also specifies affected layers and mipmaps.



### Image format and usage

`VkImageCreateInfo's` [format](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFormat.html) describes format and type of each texel. The format has a following pattern: first, it lists all channels with number of bits (e.g. `R8G8B8A8`), then how the bits are interpreted (so called [numeric format](https://registry.khronos.org/vulkan/specs/1.3/html/vkspec.html#_identification_of_formats) e.g. `SINT` for signed int, `UINT` for unsigned int). Examples:

* `VK_FORMAT_R8G8B8A8_UINT`. Has 4 channels, 8 bits per channel. Each byte is Rust's `u8` (0..=255).
* `VK_FORMAT_R8G8B8_SINT`. Has 3 channels, 8 bits per channel. Each byte is Rust's `i8` (-128..=127).
* `VK_FORMAT_R8G8_SNORM`. Has 2 channels, 8 bits per channel. Each component is a signed normalized value in the range [-1, 1].
* `VK_FORMAT_R5G6B5_UNORM_PACK16 `. Has 3 channels, red and blue channels have 5 bits, green has 6 bits (whole texel color information packed into 16 bits).
* `VK_FORMAT_B8G8R8_SRGB`. Has 3 channels, 8 bits per channel. Each component is an unsigned normalized value in range [0, 1] representing values using sRGB nonlinear encoding.
* `VK_FORMAT_D16_UNORM_S8_UINT`. It's a depth/stencil format where depth takes 16 bits and stencil 8 bits. In reality, depth/stencil formats in Vulkan [do not need to be stored in the exact number of bits or component ordering incicated by the enum](https://registry.khronos.org/vulkan/specs/1.3/html/vkspec.html#formats-depth-stencil).
* `VK_FORMAT_D32_SFLOAT`. Depth only format using single `f32`. According to validation layers, NVIDIA does not like it.

[Fixed-point data conversions](https://registry.khronos.org/vulkan/specs/1.3/html/vkspec.html#fundamentals-fixedconv) are described in Vulkan spec. For example, if a component is stored as normalized unsigned 8 bits ("unsigned normalized fixed-point integers") has value 100, then it can be read as float as such: $$f=\frac{100}{2^8-1}~=0.39$$.

There are also other formats like [compressed](https://learn.microsoft.com/en-us/windows/win32/direct3d10/d3d10-graphics-programming-guide-resources-block-compression) `VK_FORMAT_BC1_RGB_UNORM_BLOCK` etc.

Not all formats are supported for all usages. You can query this using [vkGetPhysicalDeviceFormatProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceFormatProperties.html). After providing a `VkFormat` you will receive information if it's e.g. usable as a color attachment or a sampled image.



### Image tiling and usage

The naive way of storing texel data is one row after another (row major order). While simple to implement, it's also very inefficient for almost any real use case. If you needed to blur 2x2 quad, it would be very hard to manage cache. In Vulkan you an set this arrangement using `VK_IMAGE_TILING_LINEAR`. I can come up with only 2 reasons to use it:

* you are transfering data from or to CPU, where linear tiling is offered by any image library,
* you have yet to implement better solution.
 
In practice, images with `VK_IMAGE_TILING_LINEAR` will still work as normal. There are some restrictions. It has to be 2D image, with 1 miplevel, 1 layer, 1 sample and format has to be color. Vulkan specification restricts usages to `VK_IMAGE_USAGE_TRANSFER_SRC_BIT` and `VK_IMAGE_USAGE_TRANSFER_DST_BIT`, but I had not major problems when I used linear tiling as a quick, **temporary** solution. This may vary depending on IHV and driver version.

The only alternative is `VK_IMAGE_TILING_OPTIMAL`. With this option, the actual in-memory representation is driver and usage dependent. You will not be able to directly transfer data from CPU to such image. `VK_IMAGE_TILING_OPTIMAL` **should** be used for **any** image in the app. The representation may depend on predeclared [usage](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageUsageFlagBits.html) e.g.

* `VK_IMAGE_USAGE_SAMPLED_BIT` - for sampling in shaders,
* `VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT` - color attachment,
* `VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT` - depth/stencil attachment, or 
* `VK_IMAGE_USAGE_STORAGE_BIT` - image storage for load/store operation,
* `VK_IMAGE_USAGE_TRANSFER_SRC_BIT` and `VK_IMAGE_USAGE_TRANSFER_DST_BIT` - transfer operations.
  
There are a few other possible [usages](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageUsageFlagBits.html). This field is a mask, you can `OR` different values. Missing `usage` flags will be communicated by Vulkan validation layers.

You may ask, if we cannot write from CPU to an image with `VK_IMAGE_TILING_OPTIMAL` tiling, how are we to upload 3D object's textures? The answer is same as for `VkBuffers` - by using temporary staging image that has `VK_IMAGE_TILING_LINEAR`. It's also common to use staging **buffer** instead.


```rust
  pub fn create_image_2D_from_data(
    allocator: &vma::Allocator,
    with_setup_cb: &impl WithSetupCmdBuffer,
    bytes: &[u8],
    format: vk::Format,
    size: vk::Extent2D,
    usage: vk::ImageUsageFlags,
    ...
  ) -> Self {
    // create mapped staging image using some util fn
    let mut (tmp_img, tmp_img_alloc) = allocate_image(
      allocator,
      size,
      format,
      vk::ImageTiling::LINEAR,
      vk::ImageUsageFlags::TRANSFER_SRC,
      vk::ImageLayout::TRANSFER_SRC_OPTIMAL, // see later on initial_layout
      vma::MemoryUsage::Auto, // don't care
      vma::AllocationCreateFlags::HOST_ACCESS_SEQUENTIAL_WRITE | vma::AllocationCreateFlags::MAPPED,
      ...
    );
    // we defined this util fn in the section about mapping VMA memory
    write_to_mapped(allocator, tmp_img_alloc, bytes);

    // create final texture
    let mut (img, img_alloc) = allocate_image(
      allocator,
      size,
      format,
      vk::ImageTiling::OPTIMAL,
      usage | vk::ImageUsageFlags::TRANSFER_DST,
      vk::ImageLayout::TRANSFER_DST_OPTIMAL, // I wish it was so simple
      vma::MemoryUsage::GpuOnly,
      vma::AllocationCreateFlags::empty(),
      ...
    );
    // transfer the content
    with_setup_cb.with_setup_cb(|device, cmd_buf| unsafe {
      let img_copy = ash::vk::ImageCopy::builder()
        .src_offset(...)
        .src_subresource(...)
        .dst_offset(...)
        .dst_subresource(...)
        .extent(vk::Extent3D { 
          width: size.width, height: size.height, depth: 1,
        })
        .build();
      device.cmd_copy_image(
        cmd_buf,
        tmp_img,
        vk::ImageLayout::TRANSFER_SRC_OPTIMAL,
        img,
        vk::ImageLayout::TRANSFER_DST_OPTIMAL,
        &[img_copy],
      );
    });

    // cleanup tmp image
    allocator.destroy_image(tmp_img, &mut tmp_img_alloc)
    (img, img_alloc)
  }
```

A bit verbose, but you only have to write it once. If you compare this with [code for uploading buffers](#), you may notice it's very similar. Only one concept left to explore - image layouts.



### Image layouts

When explaining tiling, I said that driver may choose best memory representation given usages. This may also happen on-the-fly. It's up to driver to decide to (de-)compress or rearange data. For example, certain layouts may result in less bandwith pressure (familar term for anyone dealing with deferred renderer). Before each image usage we should do `image layout transition` to [appropriate layout](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageLayout.html) e.g.:

* `VK_IMAGE_LAYOUT_GENERAL`. Supports all types of device access. Use it if you do not want to deal with image layouts. [Sascha Willems on stackoverflow](https://stackoverflow.com/a/37033604).
* `VK_IMAGE_LAYOUT_PREINITIALIZED`. One the 2 allowed initial value for images (the other is `VK_IMAGE_LAYOUT_UNDEFINED`). This will be communicated by Vulkan validation layers.
* `VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL`/`VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL`. We have already used them in previous section.
* `VK_IMAGE_LAYOUT_PRESENT_SRC_KHR`. Required for swapchain images. If you only write to swapchain images (and never read them), you can do the layout transition once, at the start of the app.
* `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`. Used when sampling color image in shader. This includes both images loaded from hard drive and ones written to by previous render passess (when the image was used as framebuffer attachment).
* `VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL`. Sampling depth/stencil image in shader. You can also use `VkImageView` to select if you want to sample either depth or stencil. [VK_KHR_separate_depth_stencil_layouts](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_separate_depth_stencil_layouts.html) (promoted to core Vulkan 1.2) explains the intentions. Usually depth buffer is not linear so the values may depend on the perspective projection matrix. 
* `VK_IMAGE_LAYOUT_DEPTH_READ_ONLY_OPTIMAL`. Sampling depth image in shader. Usually depth buffer is not linear so the values may depend on the perspective projection matrix.
* `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`. Writing to as a color attachment. Image is part of a framebuffer.
* `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`. Writing to as a depth/stencil attachment (so format is e.g. `VK_FORMAT_D16_UNORM_S8_UINT`). Image is part of a framebuffer. Used even if we do not write depth/stencil, just use it for depth/stencil test.
* `VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL`. Writing to as a **depth only** attachment (so format is e.g. `VK_FORMAT_D32_SFLOAT`). Image is part of a framebuffer. Used even if we do not write depth/stencil, just use it for depth test.

There are many other layouts that are used not as often. There are also `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL` (can replace any of `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`, `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`, `VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL`) and `VK_IMAGE_LAYOUT_READ_ONLY_OPTIMAL` (can replace any of `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`, `VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL`, `VK_IMAGE_LAYOUT_DEPTH_READ_ONLY_OPTIMAL`).

To do the `image layout transition` you need to submit [vkCmdPipelineBarrier2](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdPipelineBarrier2KHR.html) command with appropriate [VkImageMemoryBarrier2](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageMemoryBarrier2.html) in dependencies. Now it's a good time for a [quick refresher on Vulkan synchronization](/blog/vulkan-synchronization/) as you need to specify:

* `srcStageMask`, `srcAccessMask` - previous access scope,
* `dstStageMask`, `dstAccessMask` - next access scope,
* `oldLayout`, `newLayout` - layout change,
* `image` and the [affected region](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageSubresourceRange.html) - e.g. mipmaps, layers etc.,
* queue family transfer - or set both `srcQueueFamilyIndex` and `dstQueueFamilyIndex` to `vk::QUEUE_FAMILY_IGNORED`.

As you can see, doing `image layout transition` requires global frame knowledge. Each pass has to know not only how it **will** use certain image, but also what **was** the last access. This may be tricky if you wanted to do layout transition as part of [render pass subpass](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderPassCreateInfo.html). Of course, if you do not care about previous content, you can always use `VK_IMAGE_LAYOUT_UNDEFINED`. This may [prohibit certain optimizations](https://arm-software.github.io/vulkan_best_practice_for_mobile_developers/samples/performance/layout_transitions/layout_transitions_tutorial.html). Another obvious solution is to use [render graphs](https://www.gdcvault.com/play/1024612/FrameGraph-Extensible-Rendering-Architecture-in) but that affects **entire** renderer architecture. 

Let's look at 4 most common use cases for a **color** image that is either **used as render target** or **sampled in a fragment shader** (in a different pass).

* `read-after-read`. Both passes sample the image. The first pass already did the layout transition, so for 2nd pass it's a noop.
* `write-after-read`. The first pass samples the image and 2nd renders to it. If you refer to [my synchronization article](/blog/vulkan-synchronization/) you notice that it's an `execution dependency` (`VkAccessFlagBits2` are optional). Required values for `VkImageMemoryBarrier2`:
    * previous access scope: `VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT`,
    * next access scope: `VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT`,
    * layout change: `VK_IMAGE_LAYOUT_READ_ONLY_OPTIMAL` -> `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL`,
* `read-after-write`. The first pass renders to image. The second pass samples from it. This is a `memory dependency`. Required values for `VkImageMemoryBarrier2`:
    * previous access scope: (`VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT`, `VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT`),
    * next access scope (for fragment shader): (`VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT`, `VK_ACCESS_2_SHADER_SAMPLED_READ_BIT`),
    * layout change: `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL` -> `VK_IMAGE_LAYOUT_READ_ONLY_OPTIMAL`,
* `write-after-write`. Both the first and second pass render to same image. This is a `memory dependency`. While there is no need to change image layout, we need to wait for first write to finish, before we override it. Required values for `VkImageMemoryBarrier2`:
    * both access scopes: (`VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT`, `VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT`),
    * layout change: both are `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL`,


> If this is overwhelming, you can always use one of the [libraries that simplify synchronization](/blog/vulkan-synchronization/). E.g. [simple_vulkan_synchronization](https://github.com/Tobski/simple_vulkan_synchronization) or [vk-sync-rs](https://github.com/h3r2tic/vk-sync-rs).


Now we know what image layouts are. Yet if we were to create an image right now, we would receive following validation layer error:

<Figure>
  <BlogImage
    src="./layout-preinitialized-required.png"
    alt="Validation layer error message: 'initialLayout must be VK_IMAGE_LAYOUT_UNDEFINED or VK_IMAGE_LAYOUT_PREINITIALIZED'"
  />
  <Figcaption>

Not all values are allowed in `VkImageCreateInfo.initialLayout`. 

  </Figcaption>
</Figure>


Turns out, not all layouts can be set in `VkImageCreateInfo.initialLayout`. When you create an image you have to [choose between VK_IMAGE_LAYOUT_UNDEFINED or VK_IMAGE_LAYOUT_PREINITIALIZED](https://vulkan.lunarg.com/doc/view/1.3.261.1/windows/1.3-extensions/vkspec.html#VUID-VkImageCreateInfo-initialLayout-00993). In [VkImageLayout docs](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageLayout.html) look for magical statement: "This layout can be used as the initialLayout member of VkImageCreateInfo.". You can set different layout right after the image is created. 



### Finishing image allocation

Now that we understand more about Vulkan images, let's create a run-of-the-mill image that is suitable as RGBA color attachment that can also be sampled in shaders:

```rust
let create_info = vk::ImageCreateInfo::builder()
  .image_type(vk::ImageType::TYPE_2D)
  .extent(vk::Extent3D {
    width, height, depth: 1,
  })
  .format(vk::Format::R32G32B32A32_SFLOAT)
  .tiling(vk::ImageTiling::OPTIMAL)
  .usage(vk::ImageUsageFlags::SAMPLED | vk::ImageUsageFlags::COLOR_ATTACHMENT)
  .initial_layout(vk::ImageLayout::UNDEFINED)
  .sharing_mode(vk::SharingMode::EXCLUSIVE)
  .samples(vk::SampleCountFlags::TYPE_1)
  .mip_levels(1)
  .array_layers(1)
  .build();
let alloc_create_info = vma::AllocationCreateInfo {
  usage: vma::MemoryUsage::AutoPreferDevice,
  ..Default::default()
};
let (image, allocation) = unsafe {
  allocator
    .create_image(&create_info, &alloc_create_info)
    .expect("Failed creating image")
};
```

We did not need to set any `flags` (default `0` in Ash, you should set it manually in C/C++) or `queueFamilyIndexCount` (ignored anyway due to `vk::SharingMode::EXCLUSIVE`).

After creating the image, you should also consider setting the **actual** initial layout. `VK_IMAGE_LAYOUT_UNDEFINED` or `VK_IMAGE_LAYOUT_PREINITIALIZED` are used only during initialization and can be quite awkward to handle in the rest of the code. You can use (by now very familiar) `with_setup_cb` pattern for this. This approach can also be found in Sascha Willems's [VulkanTexture.cpp](https://github.com/SaschaWillems/Vulkan/blob/a467d941599a2cef5bd0eff696999bca8d75ee23/base/VulkanTexture.cpp#L204).




### Image views


In Vulkan, you will rarely refer to raw `VkImage`. Instead, `VkImageView` is much more common. It adds another layer of semantic on top of the `VkImage`. E.g. it allows to interpret the data as `VK_IMAGE_VIEW_TYPE_CUBE` or `VK_IMAGE_VIEW_TYPE_2D_ARRAY`. You might remember similar distinction for [GLSL samplers](https://www.khronos.org/opengl/wiki/Sampler_(GLSL)) with `samplerCube`, `sampler2DArray` etc. Call [vkCreateImageView()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateImageView.html) with filled `VkImageViewCreateInfo`:


* `VkImage image`. Base image.
* `VkFormat format`. Same as for base image
* `VkImageViewType viewType`. [Interpret](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageViewType.html) `VkImage` as e.g. cubemap or an array of 2D images (similar distinction is required in GLSL shaders).
* `VkImageSubresourceRange subresourceRange`. [Select](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageSubresourceRange.html) mipmaps and layers. `VkImageAspectFlags` is a mask so it's possible to `OR` many values. This is required for depth/stencil [attachment in framebuffer](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFramebufferCreateInfo.html). On the other hand, if you want to sample only depth or only stencil from shader code, you can create an image view from the same image, but with only `VK_IMAGE_ASPECT_DEPTH_BIT` or only `VK_IMAGE_ASPECT_STENCIL_BIT`.
* `VkImageViewCreateFlags flags`. [Ignore](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageViewCreateFlagBits.html).
* `VkComponentMapping components`. [Channel swizzling/replacing](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkComponentMapping.html). Usually just set to `VK_COMPONENT_SWIZZLE_IDENTITY` for each channel. Since identity has value of `0`, in Rust we can just skip this field thanks to Ash's [Default](https://rust-unofficial.github.io/patterns/idioms/default.html). Not so much in C/C++.

`VkImageViews` are used (among other things) during:

* [frambuffer creation](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFramebufferCreateInfo.html),
* assigning values to sampler uniforms. In [VkWriteDescriptorSet](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkWriteDescriptorSet.html) there is [pImageInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDescriptorImageInfo.html) field.




## Tracking memory leaks

If you try to [destroy](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkDestroyInstance.html) Vulkan instance before freeing all objects, you will receive VMA error.


<Figure>
  <BlogImage
    src="./memory_leak.jpg"
    alt="VMA printed error: 'Some allocations were not freed before destruction of this memory block!'. Below vkDestroyDevice() error about not destroyed VK_OBJECT_TYPE_SAMPLER."
  />
  <Figcaption>

Trying to [destroy Vulkan Memory Allocator](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__init.html#gaa8d164061c88f22fb1fd3c8f3534bc1d) before freeing the allocated memory. Calling `vkDestroyDevice()` before calling `vkDestroy*()` on Vulkan objects will also print an error.

  </Figcaption>
</Figure>

There are quite a few ways to handle down memory leaks:

* Have a list of all allocated `VkBuffers` and `VkImages`. When app closes, deallocate all objects in the list. Objects can be grouped by lifetime e.g. always present or only for a single level. This is similar to C++ allocators.
* Track and deallocate all objects by hand. Very granular. I assume you either use C++ destructors-like or Rust's Drop system. While this approach is tedious, it's also very granular.
* Some 3rd party tools allow you to list all created objects. You want to trigger the capture after you deallocated all objects (at least ones you know of), but before `vkDestroyDevice()`/`vmaDestroyAllocator()`. This easily done if you do this from the code through tool's SDK.
* [VK_EXT_memory_budget](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_EXT_memory_budget.html) device extension to query current memory statistics.
  * VMA also has similiar functionality [already build in](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/statistics.html). `vmaBuildStatsString()` produces JSON dump.
* (VMA) Use `VmaAllocatorCreateInfo.pDeviceMemoryCallbacks` and log allocation/deallocation pairs.
* (VMA) Use `VmaAllocationInfo.pName`/`vmaSetAllocationName()`  to assign a custom data or name to each VMA allocation. Read more in VMA docs: ["Allocation names and user data"](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/allocation_annotation.html).


All Vulkan objects that were created with `vkCreate*()` have a corresponding `vkDestroy*()`. In Rust/ash this is often part of [Drop](https://doc.rust-lang.org/reference/destructors.html) trait. Let say you have a struct (often called `Device` or `VkContext`) that holds `vma::Allocator`, `ash::Device`, `ash::Instance`, `ash::Entry`. The `Drop()` functions will be called in [order the fields are defined](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_ctx/vk_ctx.rs#L16). Vulkan messages are much cleared if you [assign custom labels](/blog/debugging-vulkan-using-renderdoc/) to objects.



## Summary

`TODO`


## References

* [AMD Vulkan Memory Allocator docs](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/index.html)
* Adam Sawicki's ["Vulkan Memory Types on PC and How to Use Them"](https://asawicki.info/news_1740_vulkan_memory_types_on_pc_and_how_to_use_them)
* Kyle Halladay's ["Comparing Uniform Data Transfer Methods in Vulkan"](https://kylehalladay.com/blog/tutorial/vulkan/2017/08/13/Vulkan-Uniform-Buffers.html)
* OpenGL wiki [Interface blocks](https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Memory_layout)
* Vulkan tutorial: [mipmaps](https://vulkan-tutorial.com/Generating_Mipmaps), [multisampling](https://vulkan-tutorial.com/Multisampling)
* ARM's ["vulkan_best_practice_for_mobile_developers"](https://arm-software.github.io/vulkan_best_practice_for_mobile_developers/samples/performance/layout_transitions/layout_transitions_tutorial.html)
* ["Unified Resource State Management for Vulkan and Direct3D12"](http://diligentgraphics.com/2018/12/09/resource-state-management/)
* Johannes Unterguggenberger's ["Use Buffers and Images in Vulkan Shaders"](https://www.youtube.com/watch?v=5VBVWCg7riQ)
* Andrew Garrard & Frederic Garnier ["Low-level mysteries of pipeline barriers"](https://youtu.be/e0ySJ9Qzvrs?si=w3q1agvH3MWwe-z1&t=565)


