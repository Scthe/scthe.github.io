---
title: "A typical Vulkan frame"
permalink: "/blog/vulkan-frame/"
excerpt: "Let's take a look at the graphic and compute pipelines in Vulkan. Discover how to use uniforms and push constants. Get to understand VkGraphicsPipelineCreateInfo and much more."
date: 2023-12-21 12:00:00
image: "./sintel_passes.jpg"
draft: false
---


In previous articles, we have seen how to <CrossPostLink permalink="/blog/vulkan-initialization/">initialize</CrossPostLink> Vulkan and <CrossPostLink permalink="/blog/vulkan-resources/">allocate memory</CrossPostLink> for buffers/images. We've also looked into <CrossPostLink permalink="/blog/vulkan-synchronization/">synchronization</CrossPostLink>. We will now investigate how to use graphic and compute pipelines. This allows you to render triangles on the screen, or do efficient computations. As graphic pipelines are much more complicated, we will explore compute first.


In Vulkan, when wanting to use a compute/graphic pass, we can differentiate 2 steps. First, we create a `VkPipeline` object. To do so, we need to declare e.g. shader modules, uniform types, framebuffer attachment types, depth/stencil test and write, etc. Think about it as providing the context for the shader compiler. SPIR-V code contained in `.spv` files is quite generic. The more information we provide during compilation, the more optimizations the driver can do. After all the passes are declared, we can start the second step - pass execution during the render loop. Each pass will `vkCmdBindPipeline()` and record its commands to a `command buffer`. In the end, we will call `vkQueueSubmit()` (submit the commands for execution) and `vkQueuePresentKHR()` (present the swapchain image). We have already explained the render loop synchronization in <CrossPostLink permalink="/blog/vulkan-synchronization/" paragraph="Synchronization between frames in Vulkan">"Vulkan synchronization"</CrossPostLink>.



<Figure>
  <BlogImage
    src="./sintel_passes.jpg"
    alt="Frame from Rust-Vulkan-TressFX. There is a list of passes on the left. Three passes are marked as compute, rest as render."
  />
  <Figcaption>

Passes in [Rust-Vulkan-TressFX](https://github.com/Scthe/Rust-Vulkan-TressFX). There are 3 compute passes for hair physics simulation. The rest are forward rendering or post-processing.

  </Figcaption>
</Figure>



## Creating VkPipeline for computations

Most modern video games do not just render triangles on screen. There is a need for efficient calculations on a massive scale. Examples include e.g. particle simulation. Each particle has some position, velocity and collides with the scene objects. This can be done with a graphic pipeline. In [WebGL-GPU-particles](https://github.com/Scthe/WebGL-GPU-particles) I did the simulation inside the [vertex shader](https://github.com/Scthe/WebGL-GPU-particles/blob/master/src/shaders/particleSim.shader). Nowadays you would use [compute shaders](https://www.khronos.org/opengl/wiki/Compute_Shader).

In Vulkan, creating **compute pipeline** requires:

- Uniforms layout to declare the type of data on each shader binding. Raw Vulkan has complicated concepts like `VkDescriptorPool` and `VkDescriptorSetLayout`. I recommend using the [VK_KHR_push_descriptor](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_push_descriptor.html) device extension instead. Each pass (both graphic and compute) will always have a single `VkDescriptorSetLayout`. We will assign buffers/images to different bindings of this single descriptor set.
- [Push constant layout](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPushConstantRange.html). A small (at least 128 bytes) packet of data. It functions the same as a uniform buffer, but we can easily change it per draw call. This is usually faster and less error-prone than writing to a mapped GPU buffer.
- [VkPipelineLayout](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreatePipelineLayout.html). Combines layouts of uniforms and push constants.
- [VkPipeline](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipeline.html). Created from [vkCreateComputePipelines()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateComputePipelines.html). For the most part, it requires just a `VkPipelineLayout` and a reference to the shader module.

As you can see, 3 out of 4 objects describe how to assign data consumed by the GPU. We have to specify e.g. which buffers and images to use, values for constants, etc. While uniforms are the 'usual' way of handling this task, push constants also work if the data is &lt;128 bytes (not all hardware can handle more). We then create a `VkPipeline` object and are ready to start the computations.

> If you want to follow along, you can use one of Rust-Vulkan-TressFX's [simulation steps](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/tfx_simulation/tfx_sim3_pass.rs) as a reference. It contains examples of both uniform buffers and push constants.



### Declaring uniforms

> Vulkan has an always-enabled extension called [GL_KHR_vulkan_glsl](https://github.com/KhronosGroup/GLSL/blob/master/extensions/khr/GL_KHR_vulkan_glsl.txt). It describes GLSL changes wrt. OpenGL. E.g. `gl_VertexIndex` becomes `gl_VertexIndex` and `gl_InstanceID` becomes `gl_InstanceIndex`. It also defines `layout(push_constant)` and `layout(set=1, ...)`. Uniforms are now required to be a member of a uniform buffer object. Declaration `uniform float u_blurRadius;` is no longer valid.

As mentioned above, I recommend using the [VK_KHR_push_descriptor](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_push_descriptor.html) device extension. It frees the user from managing `VkDescriptorPools` and any other unpleasantries. Let's look at an example of GLSL shader code that declares uniforms:

```c
layout(binding=0) uniform GlobalConfigUniformBuffer { ... };
layout(binding=1) uniform sampler2D u_sourceTex;
layout(binding=2) uniform sampler2D u_linearDepthTex;
```

> The bindings do not have to be consecutive, but it's a good practice. It can negatively affect the performance. Make sure to set `descriptorCount` to 0 for each unused binding.


With `VK_KHR_push_descriptor` we no longer have to declare a `set`, as there is only one. [vkCreateDescriptorSetLayout()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateDescriptorSetLayout.html) requires [VkDescriptorSetLayoutCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDescriptorSetLayoutCreateInfo.html). Remember to set `VK_DESCRIPTOR_SET_LAYOUT_CREATE_PUSH_DESCRIPTOR_BIT_KHR` in `VkDescriptorSetLayoutCreateFlag flags`. Each struct in `VkDescriptorSetLayoutBinding* pBindings` contains:

- `uint32_t binding`. Same as in the GLSL code.
- `VkDescriptorType descriptorType`. [Data type](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDescriptorType.html). Validated using validation layers. Some example values:
  - `VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER`. A uniform buffer object (UBO) is used as a generic buffer with some values. This can be data [shared by every pass in a frame](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/assets/shaders/_config_ubo.glsl) (like camera position, viewport dimensions, near and far planes, etc.). Or the data for a single [currently rendered mesh](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/assets/shaders/_forward_model_ubo.glsl).
  - `VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER`. Sampled image. E.g. texture from a hard drive or an attachment from the previous graphic pass.
  - `VK_DESCRIPTOR_TYPE_STORAGE_BUFFER`. [Shader storage buffer object (SSBO)](https://www.khronos.org/opengl/wiki/Shader_Storage_Buffer_Object). Big buffer with a lot of data that we can freely index inside shaders.
  - `VK_DESCRIPTOR_TYPE_STORAGE_IMAGE`. Special image that does not use samplers. Allows to read and write from exact pixels as well as atomic operations.
- `VkShaderStageFlags stageFlags`. [Shader stages](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkShaderStageFlagBits.html) e.g. `VK_SHADER_STAGE_FRAGMENT_BIT`. Validated using validation layers.
- `VkSampler* pImmutableSamplers`. Optional field with [VkSamplers](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateSampler.html).

All in all, the whole operation is quite simple and can be simplified to the following example Rust code:


```rust
let bindings: Vec<vk::DescriptorSetLayoutBinding> = vec![
  // custom utils to construct VkDescriptorSetLayoutBinding
  create_ubo_binding(0, vk::ShaderStageFlags::FRAGMENT),
  create_texture_binding(1, vk::ShaderStageFlags::FRAGMENT),
  create_texture_binding(2, vk::ShaderStageFlags::FRAGMENT),
];
let create_info = vk::DescriptorSetLayoutCreateInfo::builder()
  .flags(vk::DescriptorSetLayoutCreateFlags::PUSH_DESCRIPTOR_KHR)
  .bindings(&bindings)
  .build();
let ds_layout = device
  .create_descriptor_set_layout(&create_info, None)
  .expect("Failed to create DescriptorSetLayout")
```


As you can see, we are describing everything that we have already specified in the GLSL shader code. Fortunately, there are tons of existing libraries that can use reflection to generate this data:

* [https://github.com/KhronosGroup/SPIRV-Reflect](),
* [https://github.com/KhronosGroup/SPIRV-Cross]() - with [user guide](https://github.com/KhronosGroup/SPIRV-Cross/wiki/Reflection-API-user-guide),
* AMD's [https://github.com/GPUOpen-LibrariesAndSDKs/V-EZ]() - seems to be inactive,
* In Rust:
  * [https://github.com/gfx-rs/rspirv]() - a comprehensive set of tools to manage SPRI-V from Rust, might be overkill,
  * [https://github.com/Traverse-Research/rspirv-reflect] - Embark Studios kajiya uses a [fork](https://github.com/h3r2tic/rspirv-reflect),
  * [https://github.com/PENGUINLIONG/spirq-rs]()
  * [https://github.com/gwihlidal/spirv-reflect-rs](),
  * [https://github.com/grovesNL/spirv_cross]() - wrapper for `SPIRV-Cross`,

> If you want to verify that uniform buffer values are correct (data alignment!), I recommend <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Debugging shader in RenderDoc">RenderDoc</CrossPostLink>.



### Declaring push constants

Vulkan [push constants](https://docs.vulkan.org/guide/latest/push_constants.html) refer to a small amount of data that we can set **during pass execution**. Vulkan specification guarantees 128 bytes. Anything more is hardware-dependent. Imagine we are writing a [separable filter](https://en.wikipedia.org/wiki/Separable_filter) like a blur. For performance reasons we first do a horizontal blur, followed by <CrossPostLink permalink="/blog/vulkan-synchronization/" paragraph="Vulkan pipeline barrier semantics">memory barriers</CrossPostLink> and the vertical blur. But how do we inform the shader about the direction of the blur? We could bind a uniform buffer with this data and change the value between draw commands. Or just use push constants to transfer `vec2` (memory aligned to `vec4`):


```c
layout(push_constant) uniform Constants {
  // Direction of the blur:
  //   - First pass:   float2(1.0, 0.0)
  //   - Second pass:  float2(0.0, 1.0)
	vec4 u_sssDirection;
};
```

If your shader uses push constants, you will need to declare it using `VkPushConstantRange`:

```rust
fn get_push_constant_range() -> vk::PushConstantRange {
  vk::PushConstantRange::builder()
    .offset(0)
    .size(size_of::<SSSBlurPassPushConstants>() as _)
    .stage_flags(vk::ShaderStageFlags::COMPUTE)
    .build()
}

#[derive(Copy, Clone, Debug)]
#[repr(C)]
struct SSSBlurPassPushConstants {
  blur_direction: Vec4,
}
unsafe impl bytemuck::Zeroable for SSSBlurPassPushConstants {}
unsafe impl bytemuck::Pod for SSSBlurPassPushConstants {}
```



### Creating compute VkPipeline

To create a compute pipeline from `VkDescriptorSetLayout`, `VkPushConstantRange` you need to:

1. [Create a pipeline layout](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreatePipelineLayout.html) that combines `VkDescriptorSetLayout` and `VkPushConstantRange`.
2. Call [vkCreateComputePipelines()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateComputePipelines.html). 
 
 
Neither `vkCreatePipelineLayout()` nor `vkCreateComputePipelines()` have many options. I can guarantee that 9 out of 10 times you will use this exact code:

```rust
pub unsafe fn create_compute_pipeline(
  device: &ash::Device,
  uniform_layouts: &[vk::DescriptorSetLayout],
  push_constant_ranges: &[vk::PushConstantRange],
  pipeline_cache: vk::PipelineCache,
  shader_path: &str,
) -> (vk::PipelineLayout, vk::Pipeline) {
  // create vk::PipelineLayout
  let pl_create_info = vk::PipelineLayoutCreateInfo::builder()
    .set_layouts(uniform_layouts)
    .push_constant_ranges(push_constant_ranges)
    .build();
  let pipeline_layout = device
    .create_pipeline_layout(&pl_create_info, None)
    .expect("Failed to create_pipeline_layout");

  // create vk::Pipeline
  let (module_cs, stage_cs) = load_compute_shader(device, shader_path);
  let create_info = vk::ComputePipelineCreateInfo::builder()
    .stage(stage_cs)
    .layout(pipeline_layout)
    .build();
  let pipelines = device.create_compute_pipelines(
    pipeline_cache, &[create_info], None
  ).expect("Failed to create_compute_pipelines");
  device.destroy_shader_module(module_cs, None);

  (pipeline_layout, take_first(pipelines))
}
```




The only undefined function is `load_compute_shader()`:



```rust
unsafe fn load_shader_module(device: &ash::Device, path: &std::path::Path) -> vk::ShaderModule {
  let mut file =
    std::fs::File::open(path).expect(&format!("Could not open file '{}'", path.to_string_lossy()));
  let spirv_code = ash::util::read_spv(&mut file).unwrap();
  let create_info = vk::ShaderModuleCreateInfo::builder()
    .code(&spirv_code)
    .build();

  device
    .create_shader_module(&create_info, None)
    .expect(&format!(
      "Failed to create shader module from file '{}'",
      path.to_string_lossy()
    ))
}

unsafe fn load_shader(
  device: &ash::Device,
  stage: vk::ShaderStageFlags,
  path: &std::path::Path,
) -> (vk::ShaderModule, vk::PipelineShaderStageCreateInfo) {
  let shader_fn_name = unsafe { std::ffi::CStr::from_ptr("main\0".as_ptr() as *const i8) };
  let shader_module = load_shader_module(device, path);
  let stage_stage = vk::PipelineShaderStageCreateInfo::builder()
    .stage(stage)
    .module(shader_module)
    .name(shader_fn_name)
    .build();

  (shader_module, stage_stage)
}

pub unsafe fn load_compute_shader(
  device: &ash::Device,
  shader_path: &str,
) -> (vk::ShaderModule, vk::PipelineShaderStageCreateInfo) {
  load_shader(
    device,
    vk::ShaderStageFlags::COMPUTE,
    std::path::Path::new(shader_path),
  )
}
```


We will use `load_shader()` with a graphic pipeline later on too. I recommend adding a check if the file has the `.spv` extension. Surely, no one ever accidentally tried to load a `.glsl` file, right?


This concludes creating a compute pipeline. It can now be used to execute physics simulations or other compute tasks.




### Using compute pipeline

To execute `VkPipeline` for compute pass you will usually have code like so:

```rust
add_synchronization_barriers(...);

device.cmd_bind_pipeline(
  command_buffer,
  vk::PipelineBindPoint::COMPUTE,
  pipeline,
);

bind_uniforms(...);
bind_push_constants(...);
let group_count_x = get_group_count_x(...);
device.cmd_dispatch(command_buffer, group_count_x, 1, 1);
```

That's all there is to it. If you've used compute shaders in OpenGL, you already know about workgroup dimensions. In CUDA it is the [size of blocks per grid and the size of threads per block](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#thread-and-block-heuristics). [vkCmdDispatch()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDispatch.html) allows to specify `groupCountX` (calculated by `get_group_count_x()`), and `groupCountY`, `groupCountZ` (both 1 in the code above). As you can see, using compute passes in Vulkan can be a bit tedious, but it's simple. Don't forget that RenderDoc <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Debugging shader in RenderDoc">offers a debugger</CrossPostLink>!

> It's useful to have a callback before and after each compute/render pass. It's used to assign a profiler scope or a <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Assigning labels to passes">debug name</CrossPostLink>.

Let's now look at how to bind values for uniforms and push constants. This is something we will do for graphic passes too. 






## Binding uniform values

Let's look again at the sample GLSL code that declares uniforms:

```c
layout(binding=0) uniform GlobalConfigUniformBuffer { ... };
layout(binding=1) uniform sampler2D u_sourceTex;
layout(binding=2) uniform sampler2D u_linearDepthTex;
```

It declares:

- `GlobalConfigUniformBuffer`. UBO struct that will be bound to some VkBuffer memory (with offset from the buffer start).
- `u_sourceTex`, `u_linearDepthTex`. Sampled images.

Fortunately, with [VK_KHR_push_descriptor](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_push_descriptor.html), it's easy to assign the resources to each binding. The [vkCmdPushDescriptorSetKHR()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdPushDescriptorSetKHR.html) function takes the following parameters:

- `VkCommandBuffer commandBuffer`. Self explanatory.
- `VkPipelineBindPoint pipelineBindPoint`. Either `VK_PIPELINE_BIND_POINT_COMPUTE` or `VK_PIPELINE_BIND_POINT_GRAPHICS`.
- `VkPipelineLayout layout`. We have already created this object.
- `uint32_t set`. Always 0 when using `VK_KHR_push_descriptor`.
- `VkWriteDescriptorSet* pDescriptorWrites`. Assignments between bindings and resources.

> The extension is called **push descriptor**, which has nothing in common with **push constants**.

Some fields in `VkWriteDescriptorSet` are used only for `VkBuffers`, some only for `VkImages`, and some for both:

- `VkDescriptorSet dstSet`. Always 0 when using `VK_KHR_push_descriptor`.
- `uint32_t dstBinding`. Value from GLSL.
- `uint32_t dstArrayElement`. Usually set to 0. It's used only with arrays (e.g. `layout(binding=0) uniform MaterialsData { Material u_Materials[]; };`). It indicates offset into the array. `VkWriteDescriptorSet` was originally used to **update** `descriptorCount` bindings starting at offset `dstArrayElement`.
- `uint32_t descriptorCount`. Number of elements in `pImageInfo`/`pBufferInfo`/`pTexelBufferView`. Only one pointer contains a value, the rest is `NULL`. This field is automatically calculated by [Ash](https://github.com/ash-rs/ash).
- `VkDescriptorType descriptorType`. [Type](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDescriptorType.html) of the uniform. E.g. a uniform/shader storage buffer object or sampled/storage image etc.
- `VkDescriptorImageInfo* pImageInfo`. [Descriptor for images](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDescriptorImageInfo.html). Contains tuple: `(VkImageView, VkLayout, Option<VkSampler>)`.
- `VkDescriptorBufferInfo* pBufferInfo`. [Descriptor for buffers](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDescriptorBufferInfo.html). Contains tuple: `(VkBuffer, offset, size)`.
- `VkBufferView* pTexelBufferView`. Used only if you want to [access buffer contents using image operations](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkBufferView.html).

Personally, I've created a utility function that handles declarations like:

```rust
let uniform_resouces = [
  BindableResource::Buffer {
    usage: BindableBufferUsage::UBO, // or BindableBufferUsage::SSBO
    binding: BINDING_INDEX_CONFIG_UBO, // value from GLSL
    buffer: (config_buffer, 0, vk::WHOLE_SIZE), // (VkBuffer, offset, size)
  },
  BindableResource::SampledImage {
    binding: BINDING_INDEX_SCENE_DEPTH, // value from GLSL
    image_view: depth_stencil_image_view, // VkImageView
    layout: depth_stencil_image_layout, // VkLayout
    sampler: sampler_nearest, // VkSampler
  },
  BindableResource::StorageImage {
    binding: BINDING_INDEX_HEAD_POINTERS_IMAGE, // value from GLSL
    image_view: ppll_head_pointers_image_view, // VkImageView
    layout: ppll_head_pointers_layout, // VkLayout
  },
];
bind_resources_to_descriptors_for_compute(..., uniform_resouces);
```

You can find the code in [uniforms.rs: bind_resources_to_descriptors()](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_utils/uniforms.rs#L161). I've slightly changed names in the code sample above to make it easier to understand. After all, it's just a simple call to [vkCmdPushDescriptorSetKHR()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdPushDescriptorSetKHR.html). With this, the uniforms are set for the next graphic/compute command. Don't forget you can use RenderDoc to preview the values.


<Figure>
  <BlogImage
    src="./renderdoc_uniforms.jpg"
    alt="RenderDoc shader debugger with an arrow pointing to the 'Constants & Resources' window."
  />
  <Figcaption>

Debugging uniform values in <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Debugging shader in RenderDoc">RenderDoc</CrossPostLink>. It also works with `push constants`.

  </Figcaption>
</Figure>


## Setting push constants values

Setting the values before the draw requires a call to [vkCmdPushConstants()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdPushConstants.html). It takes `VkPipelineLayout`, `VkShaderStageFlags` (e.g. `VK_SHADER_STAGE_FRAGMENT_BIT`), and the memory region is defined as `offset`, `size`, and `void* pValues`. The description says you can use offset and size to partially update the data. Given we have only 128 bytes, it ain't much you can update. If memory limitations are a concern, there are several ways to circumvent that. You can e.g. declare an array of uniform buffer objects and then use `push constants` to provide an index into the array. This is often used with materials. In GLSL you have `layout(binding=0)uniform MaterialsData { Material u_Materials[]; };`. Using `push constants` you can then provide an index to this array on a per-drawcall basis. Not the most performant solution, but should work fine.

Void pointers like `void* pValues` can be a daily occurrence in C/C++ (remember about alignment!). In Rust I recommend [bytemuck](https://crates.io/crates/bytemuck):

```rust
// We have declared `SSSBlurPassPushConstants` struct in section
// dedicated to declaring push constants
let push_constants = SSSBlurPassPushConstants {
  blur_direction: vec4(blur_direction.x, blur_direction.y, 0.0, 0.0),
};
let push_constants_bytes = bytemuck::bytes_of(&push_constants);
device.cmd_push_constants(
  command_buffer,
  pipeline_layout,
  vk::ShaderStageFlags::FRAGMENT,
  0, // offset
  push_constants_bytes, // data
);
```





## Defining a render pass in Vulkan

To draw a mesh using **render pass** we will need a few objects first:

- `VkDescriptorSetLayout`, `VkPushConstantRange`, `VkPipelineLayout`. Declares uniforms and push constants. Just like we have seen for compute passes.
- [VkRenderPass](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderPass.html). Contains information about expected attachments and the order of subpasses.
- [VkPipeline](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipeline.html) Combines all the above objects. Adds other things like `vertex_input_state`, `input_assembly_state`, `rasterization_state`, `depth_stencil_state`, `color_blend_state` etc. For compute pass, we created `VkPipeline` using `vkCreateComputePipelines()`. Now we will use `vkCreateGraphicsPipelines()`. This is by far the most complex object that exists in Vulkan.

Let's look at each of the above objects and see what settings are available. If You want, you can follow along the source code with Rust Vulkan TressFX's [SSSBlurPass](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/sss_blur_pass.rs).



### Creating VkRenderPass

`VkRenderPass` is a combination of attachments and subpasses. [vkCreateRenderPass()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateRenderPass.html) requires us to fill [VkRenderPassCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderPassCreateInfo.html).

If you are starting with Vulkan, I recommend only having one subpass inside each render pass. This will help you plan out synchronization. For example, image layout changes and barriers done between `vkCmdBeginRenderPass()` and `vkCmdEndRenderPass()` have a [different visibility than global](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdPipelineBarrier.html).

I advise you to manually write all barriers ([vkCmdPipelineBarrier()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdPipelineBarrier.html)) before each graphic/compute pass. With `VkAttachmentDescription` you can do layout transitions, but it's a bit clunky. Both [VkAttachmentDescription](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkAttachmentDescription.html) and [VkSubpassDependency](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSubpassDependency.html) need knowledge about **resource usage before the current pass**. Imagine you write a pass that takes a depth buffer image as a uniform. To set `VkAttachmentDescription.initialLayout`, `VkSubpassDependency.srcStageMask`, and `VkSubpassDependency.srcAccessMask` you need to know what was the last usage of the depth buffer. Was it written in the forward pass? Was it read as a uniform for SSAO? You can hardcode the values, but if you swap the order of passes, there might be a lot of bug fixing to do. It's much easier to get this info during the drawing process. Since the previous pass already recorded its commands, you can [have a 'last usage' field](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_utils/vk_texture.rs#L30). On the other hand, this solution could fail in the case of multithreaded command recording. Of course, if you have a [render graph](https://www.gdcvault.com/play/1024612/FrameGraph-Extensible-Rendering-Architecture-in) you already have this information.

> Using the `synchronization vulkan validation layer` you should be able to easily fix invalid image layouts and intra-pass dependencies.


Since we decided to skip subpasses and synchronization, all that is left is [attachment definitions](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkAttachmentDescription.html). The important fields are:

- `VkFormat format`. Valid [VkFormat](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFormat.html) value e.g. `R32G32B32A32_SFLOAT`, `R8G8B8A8_UINT`, or `D24_UNORM_S8_UINT`.
- `VkSampleCountFlagBits samples`. Choose a number of samples from a list of [predefined variants](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSampleCountFlagBits.html). Remember to also set the [VkPipelineMultisampleStateCreateInfo.rasterizationSamples](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipelineMultisampleStateCreateInfo.html) field later. With `VK_EXT_sample_locations`, you can also specify the [x and y](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSampleLocationEXT.html) coordinates of each sample.
- `VkAttachmentLoadOp loadOp`, `VkAttachmentStoreOp storeOp`. Make sure to read the docs for [VkAttachmentLoadOp](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkAttachmentLoadOp.html) and [VkAttachmentStoreOp](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkAttachmentStoreOp.html) carefully. E.g. any value other than `VK_ATTACHMENT_LOAD_OP_LOAD` can clear/discard current memory content. Set clear color using either [vkCmdBeginRenderPass()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBeginRenderPass.html) or [vkCmdClearColorImage()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdClearColorImage.html). If an attachment has depth/stencil format, `loadOp` and `storeOp` are operations for depth. `stencilLoadOp`, `stencilStoreOp` are only for stencil. For color attachments, you can set `stencilLoadOp` and `stencilStoreOp` to `0`. This way validation layers will not complain if an uninitialized memory results in a random value.
- `VkImageLayout initialLayout`, `VkImageLayout finalLayout`. See above why using these fields for an implicit layout transition barrier is clunky. In the simplest case, both layouts have the same value:
  - `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL` - color attachment,
  - `VK_IMAGE_LAYOUT_PRESENT_SRC_KHR` - replaces `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL` if you render to swapchain image,
  - one of `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL` / `VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL` / `VK_IMAGE_LAYOUT_STENCIL_ATTACHMENT_OPTIMAL` - for depth/stencil image.

With a few utility functions, this is how the render pass definition looks like for [Rust-Vulkan-TressFX's SSSBlurPass](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/sss_blur_pass.rs#L70). The pass blurs forward render output based on the 'skin' stencil mask.

```rust
unsafe fn create_render_pass(device: &ash::Device) -> vk::RenderPass {
  // depth attachment is not written to, but it's needed for the stencil test
  let depth_attachment = create_depth_stencil_attachment(
    0, // idx
    ForwardPass::DEPTH_TEXTURE_FORMAT,
    vk::AttachmentLoadOp::LOAD,   // depth_load_op
    vk::AttachmentStoreOp::STORE, // depth_store_op
    vk::AttachmentLoadOp::LOAD,   // stencil_load_op
    vk::AttachmentStoreOp::STORE, // stencil_store_op
    vk::ImageLayout::DEPTH_STENCIL_ATTACHMENT_OPTIMAL, // initial and final layout
  );
  // result image
  let color_attachment = create_color_attachment(
    1, // idx
    ForwardPass::DIFFUSE_TEXTURE_FORMAT,
    vk::AttachmentLoadOp::LOAD, // load_op
    vk::AttachmentStoreOp::STORE, // store_op
    vk::ImageLayout::COLOR_ATTACHMENT_OPTIMAL, // or (for swapchain image) PRESENT_SRC_KHR
  );

  create_render_pass_from_attachments(device, Some(depth_attachment), &[color_attachment])
}
```

The code for `create_render_pass_from_attachments()` is in Rust-Vulkan-TressFX's [src\vk_utils\render_pass.rs](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_utils/render_pass.rs#L67). As you can see, if subpasses are not used, `VkRenderPass` is not that complicated.

Even if you use a depth/stencil buffer only for tests, you still have to declare it in `VkRenderPass` with `VK_ATTACHMENT_LOAD_OP_LOAD`. It does not matter if you write to it.

> Keep in mind that `VkRenderPass` does not allocate memory nor create `VkImages`. It declares that the pass will use `VkImage` with format e.g. `R32G32B32A32_SFLOAT`. Later, we will specify `VkRenderPassBeginInfo.framebuffer` based on `VkImageViews` (itself derived from GPU-memory-backed `VkImage`).



### Graphic pipeline

`VkPipeline` for graphic pass combines `VkPipelineLayout` and `VkRenderPass`. It also allows controlling e.g. [VertexInputState](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipelineVertexInputStateCreateInfo.html), [InputAssemblyState](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipelineInputAssemblyStateCreateInfo.html), [RasterizationState](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipelineRasterizationStateCreateInfo.html), [DepthStencilState](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipelineDepthStencilStateCreateInfo.html), or [ColorBlendState](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPipelineColorBlendStateCreateInfo.html).

[Creating VkPipeline](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateGraphicsPipelines.html) requires filling all fields of the [VkGraphicsPipelineCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkGraphicsPipelineCreateInfo.html). It's tedious. I recommend writing a utility that will initialize `VkGraphicsPipelineCreateInfo` with some default values. This way:

- There is only one place to fix the errors. As you might have read in my <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Bug example when loading the capture">"Debugging Vulkan using RenderDoc"</CrossPostLink> article, I made the mistake of using memory after `Vec` went out of scope. This crashed RenderDoc at random. Fixing it was [easy enough](https://github.com/Scthe/Rust-Vulkan-TressFX/commit/8927ca22be424577e35b02643f6daeb5f9f78f26).
- Makes it impossible for certain classes of errors to happen. In Rust, Ash will happily initialize `VkStencilOpState.write_mask` to `0`. It's a bit dreary to remember to set it every time.
- It shows what is actually important. In Rust Vulkan TressFX's [forward rendering pass](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/forward_pass.rs#L166), the only thing that matters is depth stencil settings. I have worked with many people who like to copy-paste entire pages of code or JIRA ticket descriptions. Nothing says 'a job' more than diffing text of 5 JIRA tickets! As they say "If I had more time, I would have written a shorter letter.".

The values I've chosen are ones that can render a fullscreen quad. E.g. depth, stencil test/write disabled, no culling, blend mode to override current content, etc.

> I've also suggested a similar approach in the <CrossPostLink permalink="/blog/opengl-state-management/">"OpenGL state management"</CrossPostLink> article. At least in Vulkan, the settings have [less](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDepthMask.xhtml) [unhinged](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glDepthFunc.xhtml) [names](https://registry.khronos.org/OpenGL-Refpages/gl4/html/glEnable.xhtml).

It's worthwhile to create a few functions to generate common settings combinations. E.g. `stencil_write_if_touched(reference: u32, override_current: bool)` or `depth_stencil_noop()` etc. Usefulness depends on use cases. For example, in Rust-Vulkan-TressFX, there were only [4 different use cases for depth/stencil](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_utils/pipeline.rs#L205). Similar utilities proved helpful for the rest of `VkGraphicsPipelineCreateInfo's` fields.

Unfortunately, `VkGraphicsPipelineCreateInfo` has a serious problem from the API usage standpoint. It contains a lot of pointers. So if you write a function to initialize this structure, you cannot just return it to the caller. The two easiest solutions would be to:

1. Have a class that stores all transient data in members.
2. Use a [closure](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures). 
 
Here is a simplified code from [Rust Vulkan TressFX](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_utils/pipeline.rs#L55):


```rust
pub fn create_graphic_pipeline_with_defaults(
  render_pass: &vk::RenderPass,
  pipeline_layout: &vk::PipelineLayout,
  shader_paths: (&str, &str), // vertex, fragment shader .spv paths
  color_attachment_count: usize, // used for default blend state
  // callback that takes pre-filled `VkGraphicsPipelineCreateInfo`,
  // overrides the default values if needed and returns
  // final VkPipeline object.
  creator: impl Fn(vk::GraphicsPipelineCreateInfoBuilder) -> vk::Pipeline,
) -> vk::Pipeline {
  let stages = load_render_shaders(shader_paths);
  let create_info_builder = vk::GraphicsPipelineCreateInfo::builder()
    ... // set other default values
    .stages(&stages)
    .layout(*pipeline_layout)
    .render_pass(*render_pass);

  // invoke the callback with prefilled values
  creator(create_info_builder)
}

// usage:
create_graphic_pipeline_with_defaults(
  render_pass,
  pipeline_layout,
  Self::SHADER_PATHS,
  Self::COLOR_ATTACHMENT_COUNT,
  |builder| {
    let depth_stencil = vk::PipelineDepthStencilStateCreateInfo::builder()
      ...
      .build();
    let pipeline_create_info = builder
      .vertex_input_state(...)
      .depth_stencil_state(&depth_stencil)
      .build();
    create_pipeline(device, pipeline_cache, pipeline_create_info)
  },
)
```


You can find the full usage sample in [ForwardPass.create_pipeline()](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/forward_pass.rs), and the utility itself in [pipeline.rs](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/vk_utils/pipeline.rs#55)

As for what each struct field does, I recommend reading the docs carefully. If you have worked with any graphic API before, you will find the options familiar. Some of the options I've described in detail in the <CrossPostLink permalink="/blog/opengl-state-management/">"OpenGL state management"</CrossPostLink> article.

`VkGraphicsPipelineCreateInfo` is the most complex object in Vulkan. Unfortunately, you might have to create a lot of `VkPipelines` for a single graphic pass. In Rust-Vulkan-TressFX, both mesh and hair can cast shadows. The fragment shader is the same in both cases. Only vertex shader changes. This means that for this pass I had to create:

- 1 `VkRenderPass`. Same attachments for both meshes and hair.
- 1 `VkDescriptorSetLayout`. Only hair rendering required uniforms (SSBOs for hair positions, some per-object settings, etc.).
- 1 `VkPushConstantRange`. Both meshes and hair can use the same `Push Constants` layout. It includes the model matrix, shadow caster position, and viewport size.
- 2 `VkPipelineLayouts`. One for meshes, one for hair.
- 2 `VkPipelines`. One for meshes, one for hair.

This gets exponentially worse in more complex apps. There might be many vertex layouts. Or material properties that are either a constant or are sampled from a texture.

> With [VK_KHR_pipeline_library](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_pipeline_library.html) device extension you can split the `vkCreateGraphicsPipelines()` into more manageable stages. This extension was created to reduce the number of different `VkGraphicsPipelineCreateInfo` permutations. For example, imagine that between 2 `VkGraphicsPipelineCreateInfo` objects, only `VkGraphicsPipelineCreateInfo.pVertexInputState` changes. E.g. different vertex formats for some scene objects. Currently, in Vulkan, both vertex and fragment shaders would need to be compiled twice. `VK_KHR_pipeline_library` can optimize the process. Vertex format does not affect fragment shaders. While this is a simplified description, I hope it was descriptive enough.



### Creating framebuffers

We have already declared everything that is a part of a graphic pass. We will now create an entirely separate `VkFramebuffer`. As you might know from other APIs, the framebuffer is a collection of `VkImages`. [vkCreateFramebuffer()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateFramebuffer.html) takes an array of `VkImageViews`, size (as `VkExtent2D`) and a `VkRenderPass` object. My utility in Rust:

```rust

pub unsafe fn create_framebuffer(
  device: &ash::Device,
  render_pass: vk::RenderPass,
  image_views: &[vk::ImageView],
  size: &vk::Extent2D,
) -> vk::Framebuffer {
  let create_info = vk::FramebufferCreateInfo::builder()
    .render_pass(render_pass)
    .attachments(image_views)
    .width(size.width)
    .height(size.height)
    .layers(1)
    .build();
  device
    .create_framebuffer(&create_info, None)
    .expect("Failed to create framebuffer")
}
```

Make sure that `VkImageView's` format is the same as the one declared in `VkRenderPass`.

There are a few use cases when creating framebuffers:

- Allocate new images for the framebuffer.
- Framebuffer reuses images created by the previous pass. E.g. Rust-Vulkan-TressFX's forward pass writes to the depth buffer. Later, [hair rendering](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/src/render_graph/tfx_render/tfx_ppll_build_pass.rs) reuses the depth buffer for depth tests.
- Framebuffer uses only existing images. This will happen e.g. if you want to render to swapchain's image view.

There are many other use cases. Somewhere in your app, you will have to store all the created `VkImages`, `VkImageViews`, and `VkFramebuffers`. There is often a need to access each specific `VkImageView` and `VkFramebuffer`. A popular solution is e.g. token system. Your forward pass would 'return' `forwardPassDiffuse: ResourceToken`. You can use the token to retrieve the `VkImageView` later. Other approaches exist too.




## Executing graphic pass

To draw triangles onto a framebuffer you will usually have a code like so:

```rust
add_synchronization_barriers(...);

// begin render pass
let clear_values: [ClearValue; _] = [...];
let render_area: vk::Rect2D = size_to_rect_vk(&viewport_size);
let render_pass_begin_info = vk::RenderPassBeginInfo::builder()
  .render_pass(render_pass) // created during pass initialization
  .framebuffer(framebuffer) // created during pass initialization
  .render_area(render_area)
  .clear_values(&clear_values)
  .build();
device.cmd_begin_render_pass(
  command_buffer,
  &render_pass_begin_info,
  vk::SubpassContents::INLINE,
);

// set dynamic state that was declared in VkGraphicsPipelineCreateInfo
let viewport: vk::Viewport = create_viewport(&viewport_size);
device.cmd_set_viewport(command_buffer, 0, &[viewport]);

// bind pipeline
device.cmd_bind_pipeline(
  command_buffer,
  vk::PipelineBindPoint::GRAPHICS,
  pipeline,
);

// draw calls
for entity in &scene.objects {
  bind_uniforms(entity, ...);
  bind_push_constants(entity, ...);
  device.cmd_bind_vertex_buffers(command_buffer, 0, &[entity.vertex_buffer], &[0]);
  device.cmd_bind_index_buffer(
    command_buffer,
    entity.index_buffer,
    0,
    vk::IndexType::UINT32,
  );
  device.cmd_draw_indexed(
    command_buffer,
    entity.vertex_count,
    entity.instance_cnt,
    entity.first_index,
    entity.vertex_offset,
    entity.first_instance
  );
}

// end render pass
device.cmd_end_render_pass(command_buffer);
```

While that's a lot of code, there is not much new. We have already seen most of it in the compute pass. Albeit we have to call [vkCmdBeginRenderPass()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBeginRenderPass.html) (and the corresponding [vkCmdEndRenderPass()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdEndRenderPass.html)), the [VkRenderPassBeginInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkRenderPassBeginInfo.html) doesn't have many fields to fill. And what it has is quite self-explanatory. When defining `VkGraphicsPipelineCreateInfo` you could have provided a [dynamic state](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDynamicState.html). Now it's time to provide the actual values using e.g. `cmd_set_viewport`, `cmd_set_scissor`, etc. Like with the compute pass, call `vkCmdBindPipeline()`. This time with `VK_PIPELINE_BIND_POINT_GRAPHICS` instead of `VK_PIPELINE_BIND_POINT_COMPUTE`. We've also seen binding uniforms and push constants. Calls to [vkCmdBindVertexBuffers()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBindVertexBuffers.html) and [vkCmdBindIndexBuffer()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBindIndexBuffer.html) are optional. It may happen that certain objects do not have vertex or index buffers. In Rust-Vulkan-TressFX, when rendering hair, the vertex data is [taken from SSBOs](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/assets/shaders/tfx_render/tfx_ppll_build.vert.glsl) instead. As of Vulkan 1.3, there are only 4 `vkCmdDraw*()` commands:

- [vkCmdDraw()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDraw.html),
- [vkCmdDrawIndexed()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDrawIndexed.html),
- [vkCmdDrawIndirect()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDrawIndirect.html),
- [vkCmdDrawIndexedIndirect()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDrawIndexedIndirect.html).

Of course, in the real app, there are more efficient ways of rendering the triangles. Rebinding uniforms for every object is probably not the best idea. You might also store all vertex and index buffers in big continuous `VkBuffers`. Use `entity.first_index` and `entity.vertex_offset` parameters to control offsets.

> It's useful to have a callback before and after each compute/render pass. It's used to assign a profiler scope or a <CrossPostLink permalink="/blog/debugging-vulkan-using-renderdoc/" paragraph="Assigning labels to passes">debug name</CrossPostLink>.



### Drawing fullscreen triangle

Drawing a triangle that covers every pixel of the screen is one of the most common operations. Every post-processing effect will use this technique. Sascha Willems's ["Vulkan tutorial on rendering a fullscreen quad without buffers"](https://www.saschawillems.de/blog/2016/08/13/vulkan-tutorial-on-rendering-a-fullscreen-quad-without-buffers/) works wonders. I've created a [single vertex shader](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/c0a020e1117bbb2d4ab6737738d8f89b9cb8b4b1/assets/shaders/fullscreen_quad.vert.glsl) and then reused it in every suitable pass.

Unfortunately, if you come from OpenGL there is a caveat. Vulkan uses different coordinate system. I admit, that I always fix it by trial and error. Read Matthew Wellings's ["The new Vulkan Coordinate System"](https://matthewwellings.com/blog/the-new-vulkan-coordinate-system/) and Johannes Unterguggenberger's ["Setting Up a Proper Projection Matrix for Vulkan"](https://johannesugb.github.io/gpu-programming/setting-up-a-proper-vulkan-projection-matrix/) for a detailed explanation of the consequences.



## Summary

This article concludes the series on using the Vulkan API. When I started [Rust-Vulkan-TressFX](https://github.com/Scthe/Rust-Vulkan-TressFX), I had only the [Vulkan-tutorial](https://vulkan-tutorial.com/) and the official specification as a guide. The project is finished. I've written down what I have learned. We've worked our way through countless functions, parameters, and structures. We've seen which ones we can ignore. If you want to know more about Vulkan, I recommend looking through the references under every post. There is a scarcity of detailed explanations available on the net. Hope you've learned something.



## References

* Arseny Kapoulkine's ["Writing an efficient Vulkan renderer"](https://zeux.io/2020/02/27/writing-an-efficient-vulkan-renderer/)
* Yuriy O'Donnell's ["FrameGraph: Extensible Rendering Architecture in Frostbite"](https://www.gdcvault.com/play/1024612/FrameGraph-Extensible-Rendering-Architecture-in)
* [Vulkan docs for Push Constants](https://docs.vulkan.org/guide/latest/push_constants.html)
* [CUDA best practices guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html#thread-and-block-heuristics)
* Sascha Willems's ["Vulkan tutorial on rendering a fullscreen quad without buffers"](https://www.saschawillems.de/blog/2016/08/13/vulkan-tutorial-on-rendering-a-fullscreen-quad-without-buffers/)
* Read Matthew Wellings's ["The new Vulkan Coordinate System"](https://matthewwellings.com/blog/the-new-vulkan-coordinate-system/) 
* Johannes Unterguggenberger's ["Setting Up a Proper Projection Matrix for Vulkan"](https://johannesugb.github.io/gpu-programming/setting-up-a-proper-vulkan-projection-matrix/)
* Embark Studios's [kajiya](https://github.com/EmbarkStudios/kajiya/)

