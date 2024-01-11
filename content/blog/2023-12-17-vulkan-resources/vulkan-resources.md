---
title: "Vulkan resources"
permalink: "/blog/vulkan-resources/"
excerpt: "Explanation of memory allocation in Vulkan. How to use AMD's Vulkan Memory Allocator library. Exploring different parameters for VBuffer and VkImage."
date: 2023-12-17 12:00:00
image: "./layout-preinitialized-required.png"
draft: false
---



In this article we will look at two most basic resources that you will use in Vulkan: [VkBuffer](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBuffer.html) and [VkImage](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImage.html). But first, we will start with AMD's [Vulkan Memory Allocator](https://gpuopen.com/vulkan-memory-allocator/) (VMA). This library is used to simplify memory operations e.g. it has built-in defragmentation. Selecting the right flags and settings for each allocation has a detrimental effect on the performance. As we will see, a lot of choices depend on the usage patterns. For example, `VkImage` can be used as a framebuffer attachment, object texture, or a sampled image. Each scenario has different requirements and constraints. We will also explain image tiling and layouts.

This article builds on the previous <CrossPostLink permalink="/blog/vulkan-synchronization/">"Vulkan synchronization"</CrossPostLink>. Read it to understand concepts like pipeline barriers, memory dependencies, frames in flight, etc.



## Using AMD's VulkanMemoryAllocator


To create a `VmaAllocator`, use [vmaCreateAllocator()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__init.html#ga200692051ddb34240248234f5f4c17bb). The basic allocator requires a `VkInstance`, `VkPhysicalDevice`, and `VkDevice`. There are also:

* `uint32_t vulkanApiVersion`. Same Vulkan version you have provided to `vkCreateInstance()`.
* `VmaAllocatorCreateFlags flags`. Used to allow VMA to use [specified](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__init.html#ga4f87c9100d154a65a4ad495f7763cf7c), memory-related <CrossPostLink permalink="/blog/vulkan-initialization/" paragraph="Vulkan device extensions">device extensions</CrossPostLink>.
* `VkDeviceSize preferredLargeHeapBlockSize`. VMA allocates memory in blocks. While you can set the preferred block size, it's usually left as default 256 MB.
* `VkAllocationCallbacks* pAllocationCallbacks`. Allows you to intercept all allocations and assign the **CPU**(!) memory yourself. I don't think it's possible to use this field to allocate GPU memory. Still, it's nice for debugging.
* `VmaDeviceMemoryCallbacks* pDeviceMemoryCallbacks`. [Callbacks](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/struct_vma_device_memory_callbacks.html) for `pfnAllocate()` and `pfnFree()`. Both functions return `void` and are only for logging purposes.
* `VkDeviceSize* pHeapSizeLimit`. An array of `VkPhysicalDeviceMemoryProperties::memoryHeapCount` values that limit the maximum number of bytes allocated from each heap. The allocation may fail with `VK_ERROR_OUT_OF_DEVICE_MEMORY` if there is no memory available on the selected heap. Usually leave the default `NULL`.
* `VkExternalMemoryHandleTypeFlagsKHR* pTypeExternalMemoryHandleTypes`. Used with Vulkan's [VkExportMemoryAllocateInfoKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkExportMemoryAllocateInfoKHR.html).

Use the received `VmaAllocator` object to allocate memory using the following functions:

* [vmaCreateBuffer()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gac72ee55598617e8eecca384e746bab51). Takes `VmaAllocator`, `VkBufferCreateInfo`, and `VmaAllocationCreateInfo` as parameters.
* [vmaCreateImage()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#ga02a94f25679275851a53e82eacbcfc73). Takes `VmaAllocator`, `VkImageCreateInfo`, and `VmaAllocationCreateInfo` as parameters.

We will investigate `VkBufferCreateInfo` and `VkImageCreateInfo` in more detail later in this article. [VmaAllocationCreateInfo](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/choosing_memory_type.html) is used by VMA to select the optimal memory region for the allocation. Fields like `memory_type_bits`, [pool](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/custom_memory_pools.html), and `priority` can be safely ignored. Use `pUserData` to add custom data to an allocation (e.g. to track memory leaks). The `VmaMemoryUsage`, `VmaAllocationCreateFlags`, and `VkMemoryPropertyFlags` fields are where most of the decisions are made.



### VmaAllocationCreateInfo: VmaMemoryUsage

Since VMA version 3.0.0, [VMA_MEMORY_USAGE_*](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gaa5846affa1e9da3800e3e78fae2305cc) has only 3 values:

* `VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE` - GPU memory,
* `VMA_MEMORY_USAGE_AUTO_PREFER_HOST` - CPU memory,
* `VMA_MEMORY_USAGE_AUTO` - decided by VMA.

AMD suggests always using `VMA_MEMORY_USAGE_AUTO`, but all of the above values are just hints. Even if you set `VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE`, the memory can still be allocated in RAM. This can rarely happen for mappable resources.

> There is also `VMA_MEMORY_USAGE_GPU_LAZILY_ALLOCATED` but documentation says it's largely for mobile devices. I assume it's an option for tiled renderers when attachment texels do not have to be written into persisted memory. Next subpass would use a value from a register/L1 cache instead.



### VmaAllocationCreateInfo: VmaAllocationCreateFlags

There are many options for [flags](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gad9889c10c798b040d59c92f257cae597), and most of them refer to specific use cases. The most common are:

* `VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT`. Used for image attachments that (due to their size) prefer their own memory block.
* `VMA_ALLOCATION_CREATE_MAPPED_BIT`. Persistently mapped memory. According to the documentation, there are usually 2 possibilities:
    * sequential access:
        * `flags`: `VMA_ALLOCATION_CREATE_MAPPED_BIT | VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT`,
        * `required_flags`: `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT`,
    * random access:
        * `flags`: `VMA_ALLOCATION_CREATE_MAPPED_BIT | VMA_ALLOCATION_CREATE_HOST_ACCESS_RANDOM_BIT`,
        * `required_flags`: `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_CACHED_BIT`.

While flags for persistently mapped memory might seem convoluted, you almost always use sequential read/write access. In practice, not all mentioned flags seem to be required. Even AMD does not set `required_flags` (see below). There are a few other flags that specify e.g. what to do if the device runs out of memory, etc.



### VmaAllocationCreateInfo: `required_flags` and `preferred_flags`

You should avoid `required_flags` as they force certain behavior. `preferred_flags` are just hints. `VMA` can deduce optimal values for `required_flags` and `preferred_flags` based on `flags`. The values are based on Vulkan's [VkMemoryPropertyFlagBits](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkMemoryPropertyFlagBits.html):

* `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`. Memory should be allocated on the GPU. It's usually not easily accessible from the CPU. Preferred for:
    * image attachments,
    * compute buffers,
    * 3D object textures and buffers,
    * everything that rarely changes and favors fast access.
* `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT`. Make memory visible from the host.
* `VK_MEMORY_PROPERTY_HOST_COHERENT_BIT`. Alleviates need to call `vkFlushMappedMemoryRanges()` (or `vkInvalidateMappedMemoryRanges()`) after each CPU (or GPU) write to the mapped memory. <CrossPostLink permalink="/blog/vulkan-synchronization/" paragraph="VkAccessFlagBits2, execution and memory dependencies">Assures availability. Does not guarantee visibility.</CrossPostLink>
* `VK_MEMORY_PROPERTY_HOST_CACHED_BIT`. Create a cached version of the memory on the host for faster access. I'm not sure how this flag works with `VK_MEMORY_PROPERTY_HOST_COHERENT_BIT`. If I wanted both, I would set them in `preferred_flags`. There is a [StackOverflow thread](https://stackoverflow.com/questions/45017121/are-host-cached-bit-and-host-coherent-bit-contradicting-each-other) where someone else noticed this issue.

Both `required_flags` and `preferred_flags` are masks, so you can combine many options using logical OR operation. Popular library ["gpu-allocator" by Traverse-Research](https://github.com/Traverse-Research/gpu-allocator) differentiates the following use cases to determine `preferred_flags`:

* `MemoryLocation::GpuOnly` - `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`.
* `MemoryLocation::CpuToGpu` - `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`. Coherent, host-visible memory is ideal for mapped memory. All modern GPUs have about 256MB accessible from the CPU with little performance penalty. This is known as the `Base Address Register (BAR)`.
* `MemoryLocation::GpuToCpu` - `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_CACHED_BIT`. Fast read access to cached memory from the CPU.


It's worth mentioning that if we only set `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT` the memory *can* be allocated on the host (CPU). The GPU reads would require PCI-express bus transfer.

> For more information about `Base Address Register (BAR)` and `Smart Access Memory (SAM)`, I recommend Adam Sawicki's ["Vulkan Memory Types on PC and How to Use Them"](https://asawicki.info/news_1740_vulkan_memory_types_on_pc_and_how_to_use_them). He works for AMD and is one of the VMA creators.



### VMA allocations in practice

VMA documentation comes with [usage samples](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/usage_patterns.html). Notice that `VmaAllocationCreateInfo.usage` is always `VMA_MEMORY_USAGE_AUTO`. No `required_flags` or `preferred_flags` are set. Only `flags` are used to determine the final memory allocation placement. AMD discerns the following use cases:

* `VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT`. Often used, GPU-allocated resources. Image attachments, compute buffers, static 3D object textures and buffers, etc. You can query for [VkMemoryDedicatedRequirementsKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkMemoryDedicatedRequirementsKHR.html). This acts only as a hint to a driver.
* `VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT`. Temporary staging buffer that the CPU will write to. Its content will be then copied to a high-performance GPU memory. For all we know, this temporary allocation may end up either in the CPU's RAM or GPU's `Base Address Register`. This pattern is needed as memory allocated with `VMA_ALLOCATION_CREATE_MAPPED_BIT` may have to sacrifice performance in order for the CPU to write to it. It disables certain optimization that the driver might do.
* `VMA_ALLOCATION_CREATE_HOST_ACCESS_RANDOM_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT`. Mapped memory when you want to read the GPU's memory from the CPU.

AMD's documentation contains a section dedicated to uniform buffers. They are usually written from the CPU at least once per frame. They are read-only for the GPU (unless you use shader load/store operations). The usage should be `VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE` and flags `VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT`. Our goal is to allocate the buffer in the before-mentioned `Base Address Register`.



### Mapping the memory

> You need to provide either `VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT` or `VMA_ALLOCATION_CREATE_HOST_ACCESS_RANDOM_BIT` in `flags` during allocation to be able to map the memory!

There are 2 common strategies for mapping memory in Vulkan:

1. Map and unmap memory region at every use.
2. Persistent mapping. Map it once after allocation and unmap only when the resource is deleted. 
 
Persistent mapping is preferred as `vkMapMemory()` can be expensive on some drivers. With VMA, you can map the same allocation multiple times. The library does the reference counting for us. This is **not** allowed in pure Vulkan. I recommend Kyle Halladay's ["Comparing Uniform Data Transfer Methods in Vulkan"](https://kylehalladay.com/blog/tutorial/vulkan/2017/08/13/Vulkan-Uniform-Buffers.html) if you are wondering which approach is the fastest.

Persistent mapping in VMA requires `VMA_ALLOCATION_CREATE_MAPPED_BIT`. Both `vmaCreateBuffer()` and `vmaCreateImage()` fill `VmaAllocationInfo.pMappedData` to which we can `memcpy()`. In Rust, we have the following code:


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

pub fn write_to_mapped(
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

It does not matter if the mapped memory is allocated for `VkBuffer` or `VkImage`. It's just a chunk of memory to which we write/read, its interpretation is irrelevant. For `VkBuffer`, I recommend aligning memory to `vec4` (4 floats, 128 bits).

For memory-mapped `VkImage`, check that the texel format is the same between the CPU data and `VkImage`. If you read from the hard drive an image that does not have an alpha channel and write it to `VK_FORMAT_R8G8B8A8_SRGB`, you will receive garbage. The tiling **has** to be `VK_IMAGE_TILING_LINEAR`. If you write bytes to vendor/driver-dependent `VK_IMAGE_TILING_OPTIMAL`, you will receive garbage. Yet, during runtime, it's recommended to use only `VkImages` with `VK_IMAGE_TILING_OPTIMAL`. To solve this, you can create a mapped scratch buffer. It's used first as a copy destination (from the CPU) and then as a copy data source (data copied to the final, optimal `VkImage` memory). We will expand on this pattern later.


### Other VMA functionalities

While basic VMA usage is intuitive, I recommend skimming the rest of the docs. Other functionalities include:

* [defragmentation](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/defragmentation.html), 
* [corruption detection](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/debugging_memory_usage.html), 
* [custom memory pools](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/custom_memory_pools.html),
* [resource aliasing](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/resource_aliasing.html).

The docs are clear and have enough examples. That's rare and worth pointing out.





## VkBuffer


[VkBuffer](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBuffer.html) represents a continuous array of bytes. To create it in raw Vulkan, provide [VkBufferCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBufferCreateInfo.html) to [vkCreateBuffer()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateBuffer.html). After that, call [vkAllocateMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAllocateMemory.html) and [vkBindBufferMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkBindBufferMemory.html) to assign the memory. With VMA, all this is one function: [vmaCreateBuffer()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#gac72ee55598617e8eecca384e746bab51) (takes `VkBufferCreateInfo` and `VmaAllocationCreateInfo` as parameters). In C++, add pointers to `VkBuffer*`, `VmaAllocation*`, and `VmaAllocationInfo*` structs that will be filled with the result data. In Rust, this is returned as a tuple `(ash::vk::Buffer, vma::Allocation)`. Here is a short example code to create and allocate `VkBuffer` using [ash](https://github.com/ash-rs/ash) and [VMA](https://github.com/GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator):


```rust
let buffer_info = vk::BufferCreateInfo::builder()
  .size(size)
  .usage(usage)
  .sharing_mode(vk::SharingMode::EXCLUSIVE)
  .queue_family_indices(&[queue_family]);

let alloc_info = vma::AllocationCreateInfo {
  usage: vma::MemoryUsage::AutoPreferDevice,
  ..Default::default()
};

let (buffer, allocation) = unsafe {
  allocator
    .create_buffer(&buffer_info, &alloc_info)
    .expect(&format!("Failed allocating VkBuffer of size: {}", size))
};
```

Since we've already discussed `VmaAllocationCreateInfo`, let's look at the other parameters. At first glance, [VkBufferCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBufferCreateInfo.html) may seem complicated. For basic usage, the following properties can be ignored:

* [VkBufferCreateFlags flags](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBufferCreateFlagBits.html). Nothing interesting there.
* [VkSharingMode sharingMode](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSharingMode.html). Usually `VK_SHARING_MODE_EXCLUSIVE`. Unless you need to use the buffer on multiple `queue families`.
* `uint32_t* queue_family_indices`. You've selected a `queue family` after calling [vkGetPhysicalDeviceQueueFamilyProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html). Can be ignored with `VK_SHARING_MODE_EXCLUSIVE` sharing mode.

> In <CrossPostLink permalink="/blog/vulkan-initialization/">"Vulkan initialization"</CrossPostLink>, we selected 1 `queue family` and created 1 `VkQueue` object. If you have many `queue families` the situation is more complicated. Remember that you can have many `queues` for a single `queue family`.

The last 2 parameters in `VkBufferCreateInfo` are `size` (in bytes) and `VkBufferUsageFlags usage`. Usage refers to if it's an index, vertex, uniform, storage buffer, etc. This field is a mask. You can provide many usages for a single buffer. This is especially important for transfer operations (`VK_BUFFER_USAGE_TRANSFER_DST_BIT`).

> It's easy to forget to set proper `VkBufferUsageFlags`. The Vulkan validation layer will inform you about this the moment the buffer is used in an unexpected way.


### Using temporary buffers to upload data

As mentioned before, not all memory allocated with `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT` is created equal. If this memory is also mapped on the CPU, it may have worse performance. But what if we have static data that 1) is written once from the CPU,  2) never changes, and 3) is read-only from the GPU? Good examples are vertex and index buffers for static 3D objects. The answer is to have a temporary buffer that serves as a middleman for the data transfer. This buffer is deleted right after the copy operation. Here is a sample Rust code to create such `VkBuffer`:

```rust
  pub fn create_buffer_from_data(
    allocator: &vma::Allocator,
    with_setup_cb: &impl WithSetupCmdBuffer,
    bytes: &[u8],
    usage: vk::BufferUsageFlags,
  ) -> (vk::Buffer, vma::Allocation) {
    let size = bytes.len();
    // create a mapped temporary buffer using some util fn
    let mut (tmp_buf, tmp_buf_alloc) = allocate_buffer(
      allocator,
      size,
      vk::BufferUsageFlags::TRANSFER_SRC,
      vma::MemoryUsage::Auto, // don't care
      vma::AllocationCreateFlags::HOST_ACCESS_SEQUENTIAL_WRITE | vma::AllocationCreateFlags::MAPPED
    );
    // we defined this util fn in the section about mapping VMA memory
    write_to_mapped(allocator, tmp_buf_alloc, bytes);

    // create a final buffer
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

First, we allocate a persistently mapped temporary buffer. We will use it as 1) transfer destination (from CPU), and 2) transfer source (to final buffer). We write our data into it. Then, create the final buffer on GPU with the `VK_BUFFER_USAGE_TRANSFER_DST_BIT` usage flag. Use [vkCmdCopyBuffer()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdCopyBuffer.html) to copy the data between buffers. Unfortunately, since it is a Vulkan command, it requires a command buffer. Vulkan applications often create a special command buffer for setup operations like this. You can find one in [EmbarkStudios' kajiya](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-backend/src/vulkan/device.rs#L554). In `Rust-Vulkan-TressFX`, I've created trait `WithSetupCmdBuffer` that requires `fn with_setup_cb(&self, callback: impl FnOnce(&ash::Device, vk::CommandBuffer));`. It is [implemented](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_ctx/vk_ctx.rs#L124) by `VkCtx`, which is my version of kajiya's `Device`. The rest of the implementation is contained in [execute_setup_cmd_buf()](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_utils/setup_cmd_buf.rs#L8). It takes care of `vkBeginCommandBuffer()`, `vkEndCommandBuffer()`, and `vkQueueSubmit()`. It should also cover synchronization, as we will destroy the temporary buffer right after the transfer operation finishes.



### Writing to uniform buffers

Let's assume this is our uniform buffer struct in GLSL:

```c
layout(binding = 0) 
uniform GlobalConfigUniformBuffer {
  vec4 u_cameraPosition; // [cameraPosition.xyz, -]
  vec4 u_viewportAndNearFar; // [viewport.w,viewport.h, near,far]
  mat4 u_viewMat;
  mat4 u_projectionMat;
}
```

How can a CPU write to the GPU-allocated buffer so that all values are received correctly? The biggest problem is always alignment. If the first member of the uniform buffer structure were `vec3`, what would be the byte offset of the second member? In OpenGL, this type of problem [leads to a huge headache](https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Memory_layout). I recommend always rounding up values to `vec4` (instead of `vec3`). At the very least, make sure that if you have members of type `float`, they are declared in groups of 4. I've also had a few issues with mixing in random `ints` between other fields. You can <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Debugging shader in RenderDoc">preview uniform values in RenderDoc</CrossPostLink>.



<Figure>
  <BlogImage
    src="./opengl_wiki_buffer_layouts.png"
    alt="Description for different GLSL blocks memory layouts. Warning to never use vec3 in std140 has a red border."
  />
  <Figcaption>

GLSL blocks memory layouts are complicated. If you ever used them, you know why I've added a red border to the warning. Screen from OpenGL wiki [Memory_layout](https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Memory_layout).

  </Figcaption>
</Figure>



Here is how to express the same uniform block in Rust:

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
    cam_pos: Vec3, // vec3! Careful!
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

* `GlobalConfigUniformBuffer`. Uniform buffer that contains all global data (camera position, viewport size, settings from UI, etc.):
  * [GLSL shader block](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/assets/shaders/_config_ubo.glsl)
  * [Rust GlobalConfigUBO](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/_shared/global_config_ubo.rs)
* Forward rendering, per-object uniform buffer:
  * [GLSL shader block](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/assets/shaders/_forward_model_ubo.glsl)
  * [Rust ForwardModelUBO](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/_shared/forward_model_ubo.rs)
* `TfxParamsUniformBuffer`. Uniform buffer that contains hair material data:
  * [GLSL shader block](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/assets/shaders/tfx_render/_tfx_params_ubo.glsl)
  * [Rust TfxParamsUBO](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/_shared/tfx_params_ubo.rs)


In <CrossPostLink permalink="/blog/vulkan-frame/" paragraph="Binding uniform values">"A typical Vulkan frame"</CrossPostLink>, we will see how to actually bind the `VkBuffer` objects to GLSL descriptors.




## VkImage

Creating [VkImage]((https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImage.html)) takes a familiar shape to any other Vulkan object. We call `vkCreateImage()` with `VkImageCreateInfo` struct. Then, call the same 2 functions as we have used with `VkBuffers` ([vkAllocateMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAllocateMemory.html), [vkBindBufferMemory()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkBindBufferMemory.html)) to allocate and bind the memory. With VMA, we provide `VkImageCreateInfo` and `VmaAllocationCreateInfo` to [vmaCreateImage()](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__alloc.html#ga02a94f25679275851a53e82eacbcfc73).

Unfortunately, `VkImageCreateInfo` requires a few new concepts.



### Miscellaneous `VkImageCreateInfo` parameters

Let's start with the fields that need little explanation. If you've used any graphic API before, you are familiar with `mipLevels` and multisampling. As with `VkBuffer`, we can also specify `VkSharingMode` and `queue_family_indices`. Here are such 'miscellaneous' fields:

* [VkImageCreateFlags flags](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageCreateFlagBits.html). Nothing terribly useful, although `VK_IMAGE_CREATE_CUBE_COMPATIBLE_BIT` is mandatory for cubemaps.
* [uint32_t mipLevels](https://en.wikipedia.org/wiki/Mipmap). Used to declare mipmaps. Alexander Overvoorde's Vulkan Tutorial has an entire [chapter dedicated to adding mipmaps](https://vulkan-tutorial.com/Generating_Mipmaps). 
* [VkSampleCountFlagBits samples](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSampleCountFlagBits.html). Used for [multisample anti-aliasing](https://en.wikipedia.org/wiki/Multisample_anti-aliasing). Alexander Overvoorde's Vulkan Tutorial has an entire [chapter dedicated to multisampling](https://vulkan-tutorial.com/Multisampling). Unfortunately, it's not as simple as just setting a `samples` flag. This information is also required when defining `VkRenderPass` attachments. The multisampling resolve is declared in the subpass definition: [VkSubpassDescription.pResolveAttachments](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSubpassDescription.html).
* [VkSharingMode sharingMode](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSharingMode.html). Usually `VK_SHARING_MODE_EXCLUSIVE`. Unless you need to use the `VkImage` on multiple `queue families`.
* `uint32_t* queue_family_indices`. You've selected a `queue family` after calling [vkGetPhysicalDeviceQueueFamilyProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html). Can be ignored with `VK_SHARING_MODE_EXCLUSIVE` sharing mode.






### Image texel count: `imageType`, `extent`, `arrayLayers`

When you think of an image, you usually imagine a 2D collection of pixels. In Vulkan, an image can have the following [VkImageTypes](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageType.html):

* 1D - a single row,
* 2D - width and height,
* 3D - width, height, and depth (imagine voxels in 3D space).
 
Dimensions are provided in [VkExtent3D](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkExtent3D.html) struct. Unused dimensions should be set to 1. This declares the size of the mipmap at level 0.

Array layers allow embedding many images inside a single `VkImage`. Imagine Minecraft, where different blocks have different materials (like wood, stone, gold, or glass). Each material has a texture of the same size. Instead of having separate `VkImages` for each material type, we can create a single `VkImage` with array layers. Each layer contains texture data for 1 material. In the shader, we use GLSL's `vec4 texture(sampler2DArray sampler, vec3 P);` to select which layer to sample. At least 1 layer is always required.

Let's look at an example cubemap declaration:

* `flags` is `VK_IMAGE_CREATE_CUBE_COMPATIBLE_BIT`,
* `imageType` is `VK_IMAGE_TYPE_2D`,
* `extent` is `{ cubeMap.width, cubeMap.height, 1 }`,
* `arrayLayers` has to be 6 - one for each side. A cubemap is an image with 6 different 2D layers.

Check the full cubemap example in [Sascha Willems' Vulkan examples](https://github.com/SaschaWillems/Vulkan/blob/3c0f3e18cdee7aa67e5e9198b76a24985bb49391/examples/texturecubemap/texturecubemap.cpp#L160) repository. It requires e.g. special `VkImageView` with `imageType=VK_IMAGE_VIEW_TYPE_CUBE`.


> Remember that <CrossPostLink permalink="/blog/vulkan-synchronization/" paragraph="Barrier types wrt. resource type">VkImageMemoryBarrier2</CrossPostLink> contains [VkImageSubresourceRange](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageSubresourceRange.html) which also specifies affected layers and mipmaps. You should store these values somewhere.



### Image format and usage

`VkImageCreateInfo's` [format](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFormat.html) describes the format and type of each texel (e.g. number of channels and bits per channel). The enum naming has a certain pattern. First, it lists all channels with the number of bits (e.g. `R8G8B8A8`). Then, how the bits are interpreted. This is a [numeric format](https://registry.khronos.org/vulkan/specs/1.3/html/vkspec.html#_identification_of_formats) e.g. `SINT` for signed int, `UINT` for unsigned int. Examples:

* `VK_FORMAT_R8G8B8A8_UINT`. Has 4 channels, 8 bits per channel. Each byte is Rust's `u8` (0..=255).
* `VK_FORMAT_R8G8B8_SINT`. Has 3 channels, 8 bits per channel. Each byte is Rust's `i8` (-128..=127).
* `VK_FORMAT_R8G8_SNORM`. Has 2 channels, 8 bits per channel. Each component is a signed normalized value in the range [-1, 1].
* `VK_FORMAT_R5G6B5_UNORM_PACK16`. Has 3 channels, red and blue channels have 5 bits, while green has 6 bits. Whole texel color information packed into 16 bits.
* `VK_FORMAT_B8G8R8_SRGB`. Has 3 channels, 8 bits per channel. Each component is an unsigned normalized value in the range [0, 1] representing values using sRGB nonlinear encoding.
* `VK_FORMAT_D16_UNORM_S8_UINT`. It's a depth/stencil format where depth takes 16 bits and stencil 8 bits. In reality, depth/stencil formats in Vulkan [do not need to be stored in the exact number of bits or component ordering indicated by the enum](https://registry.khronos.org/vulkan/specs/1.3/html/vkspec.html#formats-depth-stencil).
* `VK_FORMAT_D32_SFLOAT`. Depth-only format using single `f32`. According to validation layers, NVIDIA does not like it.

[Fixed-point data conversions](https://registry.khronos.org/vulkan/specs/1.3/html/vkspec.html#fundamentals-fixedconv) are described in Vulkan spec. For example, if a component stored as a normalized unsigned 8 bits ("unsigned normalized fixed-point integers") has a value of 100, then it can be read as float as such: $$f=\frac{100}{2^8-1}~=0.39$$.

There are also other formats like [compressed](https://learn.microsoft.com/en-us/windows/win32/direct3d10/d3d10-graphics-programming-guide-resources-block-compression) `VK_FORMAT_BC1_RGB_UNORM_BLOCK` etc.

Not all formats are supported for all usages. You can query this using [vkGetPhysicalDeviceFormatProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceFormatProperties.html). After providing a `VkFormat` you will receive information if it's e.g. usable as a color attachment or sampled image.



### Image tiling and usage

The naive way of storing texel data is one row after another (row-major order). While simple to implement, it's also inefficient for any real use case. If you needed to blur a 2x2 quad, it would be hard to manage the cache. In Vulkan, you set this arrangement using `VK_IMAGE_TILING_LINEAR`. I can come up with only 2 reasons to use it:

* you are transferring data to or from the CPU, where linear tiling is supported by every image library,
* you have yet to implement a better solution.
 
In practice, images with `VK_IMAGE_TILING_LINEAR` will still work as normal. There are some restrictions. It has to be a 2D image, with 1 miplevel, 1 layer, 1 sample, and the format has to be color. Vulkan specification restricts usages to `VK_IMAGE_USAGE_TRANSFER_SRC_BIT` and `VK_IMAGE_USAGE_TRANSFER_DST_BIT`. Yet I had no major problems when I used linear tiling as a quick, **temporary** solution for other usages. This may vary depending on the IHV and driver version.

The only alternative is `VK_IMAGE_TILING_OPTIMAL`. With this option, the actual in-memory representation is driver and usage-dependent. You will not be able to copy data from the CPU to such an image. `VK_IMAGE_TILING_OPTIMAL` **should** be used for every `VkImage` in the app. The in-memory representation may depend on predeclared [usage](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageUsageFlagBits.html) e.g.

* `VK_IMAGE_USAGE_SAMPLED_BIT` - for sampling in shaders,
* `VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT` - color attachment,
* `VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT` - depth/stencil attachment, 
* `VK_IMAGE_USAGE_STORAGE_BIT` - image storage for load/store operation,
* `VK_IMAGE_USAGE_TRANSFER_SRC_BIT` and `VK_IMAGE_USAGE_TRANSFER_DST_BIT` - transfer operations.
  
There are a few other possible [usages](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageUsageFlagBits.html). This field is a mask, you can `OR` different values. Missing `usage` flags will be communicated by Vulkan validation layers.

You may ask, if we cannot write from CPU to an image with `VK_IMAGE_TILING_OPTIMAL` tiling, how are we to upload 3D object's textures? The answer is the same as for `VkBuffers`. Use a temporary staging image that has `VK_IMAGE_TILING_LINEAR`. It's also common to use a staging buffer instead.


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

    // create the final texture
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
        .src_offset(...)      // skipped for brevity
        .src_subresource(...) // skipped for brevity
        .dst_offset(...)      // skipped for brevity
        .dst_subresource(...) // skipped for brevity
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

A bit verbose, but you only have to write it once. If you compare this with code for uploading buffers, you may notice it's similar. Only one concept left to explore - image layouts.



### Image layouts

When explaining tiling, I said that the driver may choose the best memory representation given usages. This may also happen on the fly. It's up to the driver to decide to (de-)compress or rearrange data. For example, certain layouts may result in less bandwidth pressure. Before each image usage, we should do an `image layout transition` to the [appropriate layout](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageLayout.html) e.g.:

* `VK_IMAGE_LAYOUT_GENERAL`. Supports all types of device access. Use it if you do not want to deal with image layouts. [Sascha Willems on stackoverflow](https://stackoverflow.com/a/37033604).
* `VK_IMAGE_LAYOUT_PREINITIALIZED` or `VK_IMAGE_LAYOUT_UNDEFINED`. The only 2 allowed initial values. This will be communicated by Vulkan validation layers. When transitioning to a different layout, `VK_IMAGE_LAYOUT_PREINITIALIZED` preserves the data. `VK_IMAGE_LAYOUT_UNDEFINED` does not.
* `VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL`/`VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL`. We have already used them in the previous section.
* `VK_IMAGE_LAYOUT_PRESENT_SRC_KHR`. Expected of swapchain images during [vkQueuePresentKHR()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkQueuePresentKHR.html). You would have the following flow for a swapchain image:
  1. Add pipeline barrier to set its layout to `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`.
  2. Add commands to render to it.
  3. Add pipeline barrier to set its layout to `VK_IMAGE_LAYOUT_PRESENT_SRC_KHR`. Use values for [pipeline stages](https://github.com/KhronosGroup/Vulkan-Samples/blob/d9a6b1069f8008e83a74ae6c08fc7b0235aa2830/framework/common/vk_common.cpp#L426) and [access](https://github.com/KhronosGroup/Vulkan-Samples/blob/d9a6b1069f8008e83a74ae6c08fc7b0235aa2830/framework/common/vk_common.cpp#L396) from Khronos group samples:
     * `srcStageMask = VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT`
     * `srcAccessMask = VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT`
     * `dstStageMask = VK_PIPELINE_STAGE_2_BOTTOM_OF_PIPE_BIT`
     * `dstAccessMask = VK_ACCESS_2_NONE`
  4. Call `vkEndCommandBuffer()` and submit the command buffer using `vkQueueSubmit()`.
  5. Call `vkQueuePresentKHR()`. The swapchain image is in the correct `VK_IMAGE_LAYOUT_PRESENT_SRC_KHR` layout.
* `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL`. Can replace any of:
  * `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`. Writing to a color attachment. The image is part of a framebuffer.
  * `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`. Writing to a depth/stencil attachment (so the format is e.g. `VK_FORMAT_D16_UNORM_S8_UINT`). The image is part of a framebuffer. This layout is also required if an image is used only for depth/stencil test (no write).
  * `VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL`. Writing to a **depth-only** attachment (e.g. `VK_FORMAT_D32_SFLOAT`). The image is part of a framebuffer. This layout is also required if an image is used only for depth tests (no write).
* `VK_IMAGE_LAYOUT_READ_ONLY_OPTIMAL`. Can replace any of:
  * `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`. Used when sampling color images in the shader. This includes both images loaded from the hard drive and ones written to by the previous render passes (when the image was used as a framebuffer attachment).
  * `VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL`. Sampling depth/stencil image in the shader. You can also use `VkImageView` to select if you want to sample either depth or stencil. [VK_KHR_separate_depth_stencil_layouts](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_separate_depth_stencil_layouts.html) (promoted to core in Vulkan 1.2) explains the intentions. Usually, the depth buffer is not linear. The values may depend on the perspective projection matrix. 
  * `VK_IMAGE_LAYOUT_DEPTH_READ_ONLY_OPTIMAL`. Sampling depth image in shader. Usually, the depth buffer is not linear. The values may depend on the perspective projection matrix.

There are many other niche layouts.

To do the `image layout transition` you need to submit the [vkCmdPipelineBarrier2()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdPipelineBarrier2KHR.html) command with the appropriate [VkImageMemoryBarrier2](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageMemoryBarrier2.html). Now it's a good time for a <CrossPostLink permalink="/blog/vulkan-synchronization/" paragraph="Vulkan pipeline barrier semantics">quick refresher on Vulkan synchronization</CrossPostLink> as you need to specify:


* `srcStageMask`, `srcAccessMask` - previous access scope,
* `dstStageMask`, `dstAccessMask` - next access scope,
* `oldLayout`, `newLayout` - layout change,
* `image` and the [affected region](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageSubresourceRange.html) - e.g. mipmaps, layers, etc.,
* queue family transfer - or set both `srcQueueFamilyIndex` and `dstQueueFamilyIndex` to `VK_QUEUE_FAMILY_IGNORED`.

As you can see, doing `image layout transition` requires global frame knowledge. Each pass has to know not only how **it** will use a certain image, but also what **was** the last access. This may be tricky if you want to do the layout transition as a part of the [render pass subpass](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderPassCreateInfo.html). On the other hand, during the execution phase, you can just remember the current layout value for each image. Another solution is to use [render graphs](https://www.gdcvault.com/play/1024612/FrameGraph-Extensible-Rendering-Architecture-in), but that affects the entire renderer architecture. 

Let's look at the 4 most common use cases for a **color image** that is either **used as a render target** or **sampled in a fragment shader** (in a different pass).

* `Read-after-read`. Both passes sample the image. The first pass already did the layout transition.
* `Write-after-read`. The first pass samples the image and the 2nd renders to it. If you refer to <CrossPostLink permalink="/blog/vulkan-synchronization/" paragraph="VkAccessFlagBits2, execution and memory dependencies">my synchronization article</CrossPostLink>, you notice that it's an `execution dependency` (`VkAccessFlagBits2` are optional). Required values for `VkImageMemoryBarrier2`:
    * previous access scope: `VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT`,
    * next access scope: `VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT`,
    * layout change: `VK_IMAGE_LAYOUT_READ_ONLY_OPTIMAL` -> `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL`,
* `Read-after-write`. The first pass renders to the image. The second pass samples from it. This is a `memory dependency`. Required values for `VkImageMemoryBarrier2`:
    * previous access scope: (`VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT`, `VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT`),
    * next access scope (for fragment shader): (`VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT`, `VK_ACCESS_2_SHADER_SAMPLED_READ_BIT`),
    * layout change: `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL` -> `VK_IMAGE_LAYOUT_READ_ONLY_OPTIMAL`,
* `Write-after-write`. Both the first and second pass render to the same image. This is a `memory dependency`. While there is no need to change the image layout, we need to wait for the first write to finish before we override it. Required values for `VkImageMemoryBarrier2`:
    * both access scopes: (`VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT`, `VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT`),
    * layout change: both are `VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL`,


> If this is overwhelming, you can always use one of the <CrossPostLink permalink="/blog/vulkan-synchronization/" paragraph="Q: Can you write a pipeline barrier for me?">libraries that simplify synchronization</CrossPostLink>. E.g. [simple_vulkan_synchronization](https://github.com/Tobski/simple_vulkan_synchronization) or [vk-sync-rs](https://github.com/h3r2tic/vk-sync-rs).


Now we know what image layouts are. Yet if we were to create an image right now, we would receive the following validation layer error:

<Figure>
  <BlogImage
    src="./layout-preinitialized-required.png"
    alt="Validation layer error message: 'initialLayout must be VK_IMAGE_LAYOUT_UNDEFINED or VK_IMAGE_LAYOUT_PREINITIALIZED'"
  />
  <Figcaption>

Not all values are allowed in `VkImageCreateInfo.initialLayout`. 

  </Figcaption>
</Figure>


Turns out, not all layouts can be set in `VkImageCreateInfo.initialLayout`. When you create an image you have to [choose between VK_IMAGE_LAYOUT_UNDEFINED or VK_IMAGE_LAYOUT_PREINITIALIZED](https://vulkan.lunarg.com/doc/view/1.3.261.1/windows/1.3-extensions/vkspec.html#VUID-VkImageCreateInfo-initialLayout-00993). In [VkImageLayout docs](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageLayout.html) look for a magical statement: "This layout can be used as the initialLayout member of VkImageCreateInfo.". You can set a different layout right after the image is created. 



### Finishing image allocation

Now that we understand more about `VkImage`, let's create a run-of-the-mill RGBA color attachment that can also be sampled in shaders:

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

We did not need to set any `flags` (default `0` in Ash, you should set it manually in C/C++) or `queueFamilyIndexCount` (ignored anyway due to `VK_SHARING_MODE_EXCLUSIVE`).

After creating an image, you should also consider setting the **actual** initial layout. `VK_IMAGE_LAYOUT_UNDEFINED` or `VK_IMAGE_LAYOUT_PREINITIALIZED` are used only during initialization. This can be quite awkward to handle in the rest of the code. Use the `with_setup_cb` pattern to fix this. Such a solution can also be found in Sascha Willems's [VulkanTexture.cpp](https://github.com/SaschaWillems/Vulkan/blob/a467d941599a2cef5bd0eff696999bca8d75ee23/base/VulkanTexture.cpp#L204).




### Image views


In Vulkan, you will rarely refer to raw `VkImage`. `VkImageView` is much more common instead. It adds another layer of semantics on top of the `VkImage`. E.g. it allows interpretation of the data as `VK_IMAGE_VIEW_TYPE_CUBE` or `VK_IMAGE_VIEW_TYPE_2D_ARRAY`. You might remember a similar distinction for [GLSL samplers](https://www.khronos.org/opengl/wiki/Sampler_(GLSL)) with `samplerCube`, `sampler2DArray`, etc. To create `VkImageView`, call [vkCreateImageView()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateImageView.html) with filled `VkImageViewCreateInfo`:


* `VkImage image`. Base image.
* `VkFormat format`. Same as for the base image.
* `VkImageViewType viewType`. [Interpret](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageViewType.html) `VkImage` as e.g. cubemap or an array of 2D images. A similar distinction is required in GLSL shaders.
* `VkImageSubresourceRange subresourceRange`. [Select](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageSubresourceRange.html) mipmaps and layers.
  * `VkImageAspectFlags` is a mask so it's possible to `OR` many values (e.g. `VK_IMAGE_ASPECT_DEPTH_BIT  | VK_IMAGE_ASPECT_STENCIL_BIT`). If you want to sample only depth or only stencil from shader code, create a separate image view from the same image. This time, with only `VK_IMAGE_ASPECT_DEPTH_BIT` or only `VK_IMAGE_ASPECT_STENCIL_BIT`.
* `VkImageViewCreateFlags flags`. [Ignore](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageViewCreateFlagBits.html).
* `VkComponentMapping components`. [Channel swizzling/replacing](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkComponentMapping.html). Usually set to `VK_COMPONENT_SWIZZLE_IDENTITY` for each channel. Since identity has a value of `0`, in Rust we can skip this field thanks to Ash's [Default](https://rust-unofficial.github.io/patterns/idioms/default.html). Not so much in C/C++.

Use `VkImageViews` during (among other things):

* [framebuffer creation](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFramebufferCreateInfo.html),
* assigning values to sampler uniforms. There is a [pImageInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDescriptorImageInfo.html) field in [VkWriteDescriptorSet](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkWriteDescriptorSet.html).

Now we are finally done with `VkImage`. Let's finish the article with a few practical tips.



## Tracking memory leaks

If you try to exit the Vulkan app before freeing all objects, you will receive a VMA error.


<Figure>
  <BlogImage
    src="./memory_leak.jpg"
    alt="VMA printed error: 'Some allocations were not freed before the destruction of this memory block!'. Below vkDestroyDevice() error about not destroying VK_OBJECT_TYPE_SAMPLER."
  />
  <Figcaption>

Trying to [destroy the Vulkan Memory Allocator](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/group__group__init.html#gaa8d164061c88f22fb1fd3c8f3534bc1d) before freeing the allocated memory. Calling `vkDestroyDevice()` before calling `vkDestroy*()` on Vulkan objects will also print an error.

  </Figcaption>
</Figure>

There are quite a few ways to handle memory leaks:

* Have a list of all allocated `VkBuffers` and `VkImages`. When the app closes, deallocate all objects in the list. Group objects by the lifetime e.g. always persistent or ones just for a single level. A similar approach to C++ allocators.
* Track and deallocate all objects by hand when needed. While this approach is tedious, it's also granular. VMA offers defragmentation to support this solution.
* Some 3rd party tools allow you to list all created objects. You want to trigger the capture after you have deallocated all objects (at least ones you know of), but before calling `vkDestroyDevice()`/`vmaDestroyAllocator()`. This can be done from the code through the tool's SDK.
* Use [VK_EXT_memory_budget](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_EXT_memory_budget.html) device extension to query current memory statistics.
  * VMA also has similar functionality [already built in](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/statistics.html). `vmaBuildStatsString()` produces JSON dump.
* (VMA) Use `VmaAllocatorCreateInfo.pDeviceMemoryCallbacks` and log allocation/deallocation pairs.
* (VMA) Use `VmaAllocationInfo.pName`/`vmaSetAllocationName()` to assign custom data or name to each VMA allocation. Read more in VMA docs: ["Allocation names and user data"](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/allocation_annotation.html).


All Vulkan objects that are created with `vkCreate*()` have a corresponding `vkDestroy*()`. In Rust/ash, this is often part of the [Drop](https://doc.rust-lang.org/reference/destructors.html) trait. Let's say you have a struct (often called `Device` or `VkContext`) that holds `vma::Allocator`, `ash::Device`, `ash::Instance`, `ash::Entry`. The `Drop()` functions are called in [the order the fields are defined](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_ctx/vk_ctx.rs#L16).

> Vulkan messages are easier to understand if you <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Adding labels to the Vulkan resources">assign custom labels</CrossPostLink> to objects.



## Summary

After <CrossPostLink permalink="/blog/vulkan-initialization/">"Vulkan initialization"</CrossPostLink> and <CrossPostLink permalink="/blog/vulkan-synchronization/">"Vulkan synchronization"</CrossPostLink>, we have finally started writing the application code. No longer do we mindlessly follow the required API or deal with theoretical concepts. We have seen how to allocate resources in high-performance memory regions. How to transfer data from the CPU efficiently. To achieve this, we used either temporary buffers (transfer once) or mapped memory (transfer often). From now on, we will avoid `vec3` in uniform buffers. For `VkImage`, we checked how to deal with different dimensions and sizes. `VK_FORMAT_*` enums no longer hold any secrets. We optimized `VkImages` according to the usage. Not only based on the statically declared `VK_IMAGE_USAGE_*`, but also layout transitions before every use. Finally, we investigated `VkImageViews` and finished with a few tips on tracking memory leaks.

In <CrossPostLink permalink="/blog/vulkan-frame/">"A typical Vulkan frame"</CrossPostLink>, we will finish this series of articles. Running compute shaders and graphic passes are the bread and butter of graphic programming. Knowing Vulkan synchronization, with `VkBuffers` and `VkImages` at hand, we are finally ready to draw some triangles.


## References

* [AMD Vulkan Memory Allocator docs](https://gpuopen-librariesandsdks.github.io/VulkanMemoryAllocator/html/index.html)
* Adam Sawicki's ["Vulkan Memory Types on PC and How to Use Them"](https://asawicki.info/news_1740_vulkan_memory_types_on_pc_and_how_to_use_them)
* Arseny Kapoulkine's ["Writing an efficient Vulkan renderer"](https://zeux.io/2020/02/27/writing-an-efficient-vulkan-renderer/)
* Yuriy O'Donnell's ["FrameGraph: Extensible Rendering Architecture in Frostbite"](https://www.gdcvault.com/play/1024612/FrameGraph-Extensible-Rendering-Architecture-in)
* Kyle Halladay's ["Comparing Uniform Data Transfer Methods in Vulkan"](https://kylehalladay.com/blog/tutorial/vulkan/2017/08/13/Vulkan-Uniform-Buffers.html)
* Nikita Cherniy's ["Vulkan with rust by example 2. Resources."](https://nikitablack.github.io/post/vulkan_with_rust_by_example_2_resources/)
* OpenGL wiki [Interface blocks](https://www.khronos.org/opengl/wiki/Interface_Block_(GLSL)#Memory_layout)
* Vulkan tutorial: [mipmaps](https://vulkan-tutorial.com/Generating_Mipmaps), [multisampling](https://vulkan-tutorial.com/Multisampling)
* ARM's ["vulkan_best_practice_for_mobile_developers"](https://arm-software.github.io/vulkan_best_practice_for_mobile_developers/samples/performance/layout_transitions/layout_transitions_tutorial.html)
* ["Unified Resource State Management for Vulkan and Direct3D12"](http://diligentgraphics.com/2018/12/09/resource-state-management/)
* Johannes Unterguggenberger's ["Use Buffers and Images in Vulkan Shaders"](https://www.youtube.com/watch?v=5VBVWCg7riQ)
* Andrew Garrard & Frederic Garnier ["Low-level mysteries of pipeline barriers"](https://youtu.be/e0ySJ9Qzvrs?si=w3q1agvH3MWwe-z1&t=565)
* Embark Studios's [kajiya](https://github.com/EmbarkStudios/kajiya/)


