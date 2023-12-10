---
title: "Vulkan initialization"
permalink: "/blog/vulkan-initialization/"
excerpt: "Walkthrough of Vulkan initialization steps. Create VkInstance and VkSurfaceKHR, pick GPU device, prepare swapchain and more."
date: 2023-12-10 12:00:00
image: "./result_cmp.jpg"
draft: false
---

`TODO header - image`

Vulkan is infamous for being both complex and verbose. This is the first article in the series meant to explain all the complexity. Ideal reader should at least skim [vulkan-tutorial](https://vulkan-tutorial.com/) before. I'm not going to provide snippets to copy and paste to assemble the whole program. Instead, we will walk through each API function in the order in which it is called. We will discuss what is it's purpose, when should it be called and what each parameter represents. I hope it will allow you to make more concious choices when writing the code. Other articles in the series:

* [Vulkan synchronization](#). Explains Vulkan synchronization objects, vkCmdPipelineBarrier, execution vs memory dependencies, synchronization with swapchain, frames in flight and more.
* `TODO finish`


> I'm using Rust and [Ash](https://github.com/ash-rs/ash), but I assume C++ developers will not have much problem following the code. `VK_FORMAT_B8G8R8A8_UNORM` becomes `vk::Format::B8G8R8A8_UNORM`, all functions are `snake_case` and are usually invoked on an `ash::Device` object instead of being global.


## Vulkan initialization steps

Following are the Vulkan initialization steps I have used in [Rust-Vulkan-TressFX](https://github.com/Scthe/Rust-Vulkan-TressFX):

1. Create a window of predefined size using [winit](https://github.com/rust-windowing/winit).
1. [Create Vulkan 1.3 instance](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateInstance.html) enabling e.g. `VK_LAYER_KHRONOS_validation` layer and `VK_EXT_debug_utils` extension.
1. (Optional) Initialize [VK_EXT_debug_utils](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_EXT_debug_utils.html) and add `debug_utils_messenger`.
1. Create [VkSurfaceKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSurfaceKHR.html) as a bridge between OS-backed window and Vulkan.
1. [List physical devices](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkEnumeratePhysicalDevices.html) to select one that matches our [requirements](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPhysicalDeviceProperties.html). We can filter by properties like anisotropy or storage instructions during fragment shader. We also select [device queue family](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html).
1. [Create a logical device](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkDeviceCreateInfo.html) and [queue](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetDeviceQueue.html). We can also:
    * Enable features like: `sampler_anisotropy`, `fragment_stores_and_atomics`, `independent_blend`, [separate depth stencil operations](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPhysicalDeviceSeparateDepthStencilLayoutsFeatures.html) or [VK_KHR_synchronization2](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_synchronization2.html)
    * Enable device extensions like: [VK_KHR_swapchain](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_swapchain.html), [VK_KHR_push_descriptor](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_push_descriptor.html) or [VK_KHR_shader_non_semantic_info](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_shader_non_semantic_info.html).
1. [Create swapchain](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateSwapchainKHR.html):
    * Requires [surface format](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfaceFormatsKHR.html)(e.g. `vk::Format::B8G8R8A8_UNORM` and `vk::ColorSpaceKHR::SRGB_NONLINEAR`).
    * For [present mode](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfacePresentModesKHR.html) use `FIFO_RELAXED` or `FIFO` if you want vsync or `MAILBOX` / `IMMEDIATE` otherwise.
1. Create [VkImageView](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkImageView.html) for each of [swapchain images](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetSwapchainImagesKHR.html).
1. Create [pipeline cache](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreatePipelineCache.html).

<br/>

Above steps are mandatory in every Vulkan application. Many applications do the following operations around the same time:

* [Create command pool](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateCommandPool.html) and [command buffers](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAllocateCommandBuffers.html). I've only used 1 `command buffer` per each frame-in-flight as whole app is quite simple. In multithreaded command recording this approach would have to be adjusted.
* Initialize [AMD Vulkan Memory Allocator](https://gpuopen.com/vulkan-memory-allocator/). In Rust and [Ash](https://github.com/ash-rs/ash) I've used [vma](https://crates.io/crates/vma) over [vk-mem-rs](https://github.com/gwihlidal/vk-mem-rs) as it is more actively maintained.
* Create some intra-frame synchronization objects. It's usually something like `acquire_semaphore`, `rendering_complete_semaphore` (sometimes known as `release_semaphore`), `queue_submit_finished_fence` etc. We will investigate each of these objects in [vulkan synchronization](#).

After above operations finish we can move to either initializing render graph passes (e.g. create all pipelines, render passes, image attachments and buffers needed to show final image) or load our scene (vertex and index buffers, materials etc.). After all, our Vulkan 'context' is initialized and we can start writing our app.

Let's look at each stage in more details to discover all settings that Vulkan offers to the developers.


## Creating VkInstance object

After loading Vulkan functions, first step is to [create a new Vulkan instance](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateInstance.html). For this we need [VkApplicationInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkApplicationInfo.html) as well as names of enabled validation layers and extensions.


### Selecting Vulkan version

When creating `VkApplicationInfo` you can **select Vulkan version** to use. At the time of writing, 1.3 is the latest. In Vulkan, new features are proposed as extensions. An example is [VK_NV_ray_tracing](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_NV_ray_tracing.html) proposed by NVIDIA. Later it was turned into [VK_KHR_ray_tracing_pipeline](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_ray_tracing_pipeline.html). `KHR` signifies that [Khronos Group](https://www.khronos.org/)(body responsible for Vulkan specification) expect that extension to become at some point part of core Vulkan. 

You can either set newest Vulkan version or an older one with extra instance/device extensions. The end result should be same.


### Vulkan instance extensions

Vulkan instance extensions are related to either Vulkan instalation or integration with the operating system. Use [vkEnumerateInstanceExtensionProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkEnumerateInstanceExtensionProperties.html) to list available extensions. The [vulkan.gpuinfo.org](https://vulkan.gpuinfo.org/listdevices.php) website is a database of GPU and driver capabilities. There is a page for e.g. [NVIDIA 4090 with driver 546.29.0.0 on Windows](https://vulkan.gpuinfo.org/displayreport.php?id=26220#instance). Most popular instance extensions:

* [VK_KHR_surface](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_surface.html). Adds `VkSurfaceKHR` objects that serve as a bridge between OS-backed window and Vulkan. You can use it to e.g. [query](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfaceFormatsKHR.html) available [surface formats](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSurfaceFormatKHR.html)(color space and `VkFormat`).
* [VK_KHR_win32_surface](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_win32_surface.html), [VK_KHR_xlib_surface](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_xlib_surface.html), [VK_MVK_macos_surface](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_MVK_macos_surface.html), [VK_KHR_android_surface](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_android_surface.html). Used to create `VkSurfaceKHR` based on the OS window. E.g. on Windows [vkCreateWin32SurfaceKHR()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateWin32SurfaceKHR.html) uses [HINSTANCE](https://devblogs.microsoft.com/oldnewthing/20050418-59/?p=35873) and [HWND](https://learn.microsoft.com/en-us/windows/apps/develop/ui-input/retrieve-hwnd).
* [VK_EXT_debug_utils](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_EXT_debug_utils.html). Used to pretty-print validation layer messages, add labels to objects (usefull with [RenderDoc](https://renderdoc.org/)) or group commands into logical passes. I've written ["Debugging Vulkan using RenderDoc"](/blog/debugging-vulkan-using-renderdoc/) based mostly on this extension.

> If you are using ash, both `VK_KHR_surface` and `VK_KHR_win32_surface` (or whichever is suitable for your OS) can be queried using [ash-window's enumerate_required_extensions()](https://github.com/ash-rs/ash/blob/e6d80badc389d94e2a747f442e5ed4189b66d7d3/ash-window/src/lib.rs#L121).



### Vulkan validation layers

Vulkan validation layers are probably my favorite Vulkan feature. They sit between the app and the driver to provide guidance on proper API usage. List of available layers can be accessed with [vkEnumerateInstanceLayerProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkEnumerateInstanceLayerProperties.html). Validation layers can e.g.

* Check for invalid parameters e.g. inproper [VkAccessFlagBits2](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkAccessFlagBits2.html) and [VkShaderStageFlagBits](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkShaderStageFlagBits.html) combination. 
* Detect missing synchronization e.g. write-after-write access without a barrier.
* Hint at best practices e.g. don't use `D32_SFLOAT` image format on NVIDIA's GPU.

I strongly recommend adding `VK_LAYER_KHRONOS_validation` in your app's debug build.

Alternative to enabling layers is using LunarG's `Vulkan Configurator` software that is part of [Vulkan SDK](https://www.lunarg.com/vulkan-sdk/). It's available in `VULKAN_SDK_DIR/<version subdir>/Bin/vkconfig.exe`. If you run it alongside your app, it will automatically intercept all API calls.

`TODO add image from console and Lunar's tool`


You can pretty-print the validation messages using `VK_EXT_debug_utils` instance extension. After declaring the extension use following code to setup debug callback for messages:

```rust
extern "system" fn vulkan_debug_callback(
  message_severity: vk::DebugUtilsMessageSeverityFlagsEXT,
  message_type: vk::DebugUtilsMessageTypeFlagsEXT,
  p_callback_data: *const vk::DebugUtilsMessengerCallbackDataEXT,
  _user_data: *mut std::os::raw::c_void,
) -> vk::Bool32 {
  let callback_data = unsafe { *p_callback_data };
  let message = unsafe { CStr::from_ptr(callback_data.p_message).to_string_lossy() };
  println!("VULKAN_ERR: {}", message);
  vk::FALSE
}

pub fn setup_debug_reporting(entry: &ash::Entry, instance: &ash::Instance) {
  let debug_info = vk::DebugUtilsMessengerCreateInfoEXT::builder()
    .message_severity(vk::DebugUtilsMessageSeverityFlagsEXT::ERROR)
    .message_type(vk::DebugUtilsMessageTypeFlagsEXT::GENERAL)
    .pfn_user_callback(Some(vulkan_debug_callback))
    .build();
  let debug_utils_loader = DebugUtils::new(entry, instance);
  let debug_messenger = unsafe {
    debug_utils_loader
      .create_debug_utils_messenger(&debug_info, None)
      .unwrap()
  };
}
```


## Create `VkSurfaceKHR`

After we have created [VkInstance](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateInstance.html), it's time to create `VkSurfaceKHR`. The exact method depends on your OS and how you have created app's main window. Ash contains [examples](https://github.com/ash-rs/ash/blob/02c7a8359282fa8d947fb3258e07f899bf732d14/ash-window/src/lib.rs#L35) for every OS. On Windows you can do this manually using:

```rust
#[cfg(target_os = "windows")]
pub fn create_surface_khr(
  entry: &ash::Entry,
  instance: &ash::Instance,
  window: &winit::window::Window,
) -> vk::SurfaceKHR {
  use std::ptr;
  use winapi::shared::windef::HWND;
  use winapi::um::libloaderapi::GetModuleHandleW;
  use winit::platform::windows::WindowExtWindows;

  let hwnd = window.hwnd() as HWND;
  let hinstance = unsafe { GetModuleHandleW(ptr::null()) as *const libc::c_void };
  let win32_create_info = vk::Win32SurfaceCreateInfoKHR::builder()
    .hinstance(hinstance)
    .hwnd(hwnd as *const libc::c_void)
    .build();

  let win32_surface_factory = Win32Surface::new(entry, instance);
  unsafe {
    win32_surface_factory
      .create_win32_surface(&win32_create_info, None)
      .expect("Failed to create win32 surface for khr::Win32Surface extension")
  }
}
```

There is not much to `VkSurfaceKHR`, yet we will use it over and over again. You can think of it as a Vulkan's connection to OS-backed window. Such connection is necessary if we want to present the output to the user. Among other things, `VkSurfaceKHR` is also used to check if the window's current monitor can [handle HDR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfaceFormatsKHR.html).



## Picking the GPU to create `VkDevice` and `VkQueue`

Use [vkEnumeratePhysicalDevices()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkEnumeratePhysicalDevices.html) to enumerate GPUs. For each `VkPhysicalDevice` you can ask for it's:
  * [properties](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPhysicalDeviceProperties.html) (`vkGetPhysicalDeviceProperties2()`), which include:
    * name e.g. "NVIDIA GeForce GTX 1050 Ti"
    * type e.g. `VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU`,
    * driver version
    * [limits](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPhysicalDeviceLimits.html) - restrictions for things like number of vertex attributes, viewport count, framebuffer size etc.
  * [features](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkPhysicalDeviceFeatures.html) (`vkGetPhysicalDeviceFeatures2`), which is just tons of flags if device allows e.g. sampler anisotropy or atomic store from fragment shaders.

Each `VkPhysicalDevice` offers a list of `queue families`. First we need to understand what `queue` is in Vulkan. A `queue` is something you can submit commands to. More specifically, you create a `command buffer` and then record commands (like [vkCmdDraw](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDraw.html) to draw triangles or [vkCmdDispatch](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDispatch.html) to dispatch compute shaders). When you [submit](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkQueueSubmit2.html) `command buffer` to the `queue`, the GPU will start the work. Not all `queues` can do everything. Some are limited to only graphic or transfer jobs. `Queue families` are just collections of `queues` that have similar capability.

[vkGetPhysicalDeviceQueueFamilyProperties](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html) is used to list properties of a `queue family`. Only `VkQueueFlags queueFlags` is of any interest here. You should also [check that it can present the final image](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfaceSupportKHR.html) to your `VkSurfaceKHR`.

I've mentioned that we will submit commands to a queue. Unfortunately, having queue family is not enough to create one. First you have to create a `logical device`:

```rust
pub unsafe fn create_device_and_queue(
  instance: &ash::Instance,
  phys_device: vk::PhysicalDevice,
  queue_family_index: u32,
) -> (ash::Device, vk::Queue) {
  let queue_prio = [1.0f32]; // only one queue
  let queue_create_infos = vk::DeviceQueueCreateInfo::builder()
    .queue_family_index(queue_family_index)
    .queue_priorities(&queue_prio)
    .build();
  let device_create_info = vk::DeviceCreateInfo::builder()
    .queue_create_infos(&[queue_create_infos])
    .enabled_extension_names(...) // device extensions - see next section
    .enabled_features(...)
    .build();
  let device: ash::Device = instance
    .create_device(phys_device, &device_create_info, None)
    .expect("Failed to create (logical) device");
  let queue = device.get_device_queue(queue_family_index, 0); // only one queue created above
  (device, queue)
}
```

This may look simple, but it's something you will go back a few times. Everytime you add a new functionality to your app, you may have to enable certain feature or device extension. Remember when we called [vkGetPhysicalDeviceFeatures()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceFeatures.html) to get features for a physical device? When you create logical device, you use same structure to enable selected features. The actual code has some non-obvious parts. Sometimes you have to use `const void* pNext` field to declare certain features not available in `PhysicalDeviceFeatures` struct. Probably easiest if I just link code from my [Rust-Vulkan-TressFX](https://github.com/Scthe/Rust-Vulkan-TressFX/blob/a4cb2a4a4f905e9230eb027b910031eddcf65beb/src/vk_utils/device.rs#L157).


Using devices in Vulkan involves many steps. Here is a quick summary:

1. Use [vkEnumeratePhysicalDevices()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkEnumeratePhysicalDevices.html) to find a physical device based on `VkPhysicalDeviceProperties` and `VkPhysicalDeviceFeatures`,
1. [Find a queue family](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html) on the physical device that can do graphic, compute and transfer jobs as well as present the final image. 
1. [Create a logical device](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateDevice.html). You can enable device extensions and certain features.
1. [Get queue from the logical device](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetDeviceQueue.html) that will be used to submit commands.



`TODO async compute`

`TODO https://stackoverflow.com/questions/55272626/what-is-actually-a-queue-family-in-vulkan`


### Vulkan device extensions

Here are a few of Vulkan device extensions that you might consider using:

* [VK_KHR_swapchain](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_swapchain.html). Companion to `VK_KHR_surface`. Adds ability to present the result to a window.
* [VK_KHR_synchronization2](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_synchronization2.html). Simplifies synchronization API. We will look at it closely in ["Vulkan synchronization"](#).
* [VK_KHR_push_descriptor](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_push_descriptor.html). Simplifies managing uniforms. Uniforms are used to provide data (buffers, images etc.) to shaders.
* [VK_KHR_separate_depth_stencil_layouts](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_separate_depth_stencil_layouts.html). Used to read only depth from combined depth/stencil image.
* [VK_KHR_shader_non_semantic_info](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_KHR_shader_non_semantic_info.html). We have already seen this extension in ["Debugging Vulkan using RenderDoc"](/blog/debugging-vulkan-using-renderdoc/).

Depending on the Vulkan version you declared in `VkApplicationInfo`, some of the extensions might have already been moved to core Vulkan. You will be informed about this through Vulkan validation layers.

> If you are wondering what other device layers exist, you can check [Embark Studios's kajiya](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-backend/src/vulkan/device.rs#L195).



## Create swapchain

By now we have selected vulkan version, picked GPU device and created queue to submit commands to. In the next step we will acquire a special image. Whatever we write to this image, it will be displayed (presented) to the user in the window. These images are know as a [swapchain](https://en.wikipedia.org/wiki/Swap_chain). Usually there are *at least* 2 images. One is presented to the user, while the application writes to the second one. Then the images are swapped ([double buffering](https://en.wikipedia.org/wiki/Multiple_buffering#Double_buffering_in_computer_graphics)).



### Swapchain color space and format

First step is to select [VkFormat](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkFormat.html)(e.g. `VK_FORMAT_B8G8R8A8_UNORM`) and [color space](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkColorSpaceKHR.html)(e.g. `VK_COLOR_SPACE_SRGB_NONLINEAR_KHR`). Use [vkGetPhysicalDeviceSurfaceFormatsKHR()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfaceFormatsKHR.html) to list available `VkSurfaceFormatKHR` for our `VkPhysicalDevice` and `VkSurfaceKHR`. 

Probably the [most common choices](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-backend/src/vulkan/mod.rs#L20) are the above mentioned `VK_FORMAT_B8G8R8A8_UNORM` and `VK_COLOR_SPACE_SRGB_NONLINEAR_KHR`. In truth, `VK_COLOR_SPACE_SRGB_NONLINEAR_KHR` is guaranteed. Depending on your monitor you might also receive HDR-ready `SurfaceFormatKHRs` (e.g. `{ format: R16G16B16A16_SFLOAT, color_space: EXTENDED_SRGB_LINEAR_EXT }` or `{ format: A2B10G10R10_UNORM_PACK32, color_space: HDR10_ST2084_EXT }`). I have 2 monitors and only one supports HDR. Depending on the position of the window, I get different results.

`TODO image: values I get from both monitors`

Supporting HDR is not as simple as changing the format/color space. E.g. part of your graphic pipeline may be HDR->LDR conversion, which is not needed on HDR. You might also be using LUTs for color grading. This is fine for LDR, but you would never do this with HDR (special functions are a better alternative). Having 256x256x256 LUT was fine, but HDRs have higher range of values. Though even when presenting on LDR screens you probably want to do color grading before the conversion to LDR. Alex Fry's [High Dynamic Range Color Grading and Display in Frostbite](https://www.youtube.com/watch?v=7z_EIjNG0pQ) presentation is a great introduction.

Color space decides how the display engine will [*interpret* the values](https://stackoverflow.com/a/66401423) in the swapchain images. All lighting computations are done in linear space (unless you forgot to use `*_SRGB` format with your diffuse textures!). But the swapchain with `VK_COLOR_SPACE_SRGB_NONLINEAR_KHR` color space will interpret the values as if they were SRGB. There are 2 solutions:

* use `VK_FORMAT_B8G8R8A8_UNORM` format and before writing to swapchain image do [gamma correction](https://en.wikipedia.org/wiki/Gamma_correction). Simple `pow(color, 1.0 / gammaValue)` is enough. `gammaValue` is usually [2.2](https://en.wikipedia.org/wiki/SRGB#Transfer_function_(%22gamma%22)).
* use `VK_FORMAT_B8G8R8A8_SRGB` format and just write linear-space values. Swapchain will automatically apply gamma correction.

`TODO 4 images: B8G8R8A8_UNORM/B8G8R8A8_SRGB, colorspace SRGB_NONLINEAR or not | with gamma 2.2 in shader or not`


### VkPresentModeKHR and enabling VSync

Every monitor has an innate refresh rate, usually 60Hz or 144Hz. It (in crude terms) indicates how much frames it can display per second. Yet your app does not have to be limited by this. You are allowed to render at e.g. 1000 frames/second. At some point you will [queue the image for presentation](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkQueuePresentKHR.html). But the monitor might be in the middle of updating with an older image. There are 2 most obvious solution. Presenting continues with new image, which leads to [tearing](https://en.wikipedia.org/wiki/Screen_tearing). Or it continues with older image, temporarly ignoring the newest one.

> As this is a Vulkan tutorial, I assume you are familiar with VSync, tearing and are more interested in how to use it instead.

In Vulkan, you can [query which VkPresentModeKHR are available](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfacePresentModesKHR.html) for choosen `VkPhysicalDevice` and `VkSurfaceKHR`. Usually you end up with something like this:

```rust
pub unsafe fn get_present_mode(
  surface_loader: &Surface,
  surface_khr: vk::SurfaceKHR,
  phys_device: vk::PhysicalDevice,
  vsync: bool,
) -> vk::PresentModeKHR {
  let present_modes = surface_loader
    .get_physical_device_surface_present_modes(phys_device, surface_khr)
    .expect("Failed to get surface present modes");
  // preferences based on if we want vsync
  let present_mode_preference = if vsync {
    vec![vk::PresentModeKHR::FIFO_RELAXED, vk::PresentModeKHR::FIFO]
  } else {
    vec![vk::PresentModeKHR::MAILBOX, vk::PresentModeKHR::IMMEDIATE]
  };
  present_mode_preference
    .into_iter()
    .find(|mode| present_modes.contains(mode))
    .unwrap_or(vk::PresentModeKHR::FIFO) // FIFO is guaranteed
}
```

Documentation for `VkPresentModeKHR` is suprisingly easy to read. I can also recommend Johannes Unterguggenberger's ["Presentation Modes and Swap Chain Setup in Vulkan"](https://www.youtube.com/watch?v=nSzQcyQTtRY). `VK_PRESENT_MODE_FIFO_KHR` is always available and makes a good default.

> Please remember `VkPresentModeKHR` as it will be important when we discuss [frames in flight](#).

Yet this is not enough to enable/disable vsync. Imagine some old school WinForms app. It rerenders the content **only** after user interaction. Of course, in video games we do not want this (though it could be useful in e.g. main menu when nothing dynamic happens). I have used winit Rust library and this behaviour is described in [event handling](https://docs.rs/winit/0.25.0/winit/#event-handling) section.

```rust
let event_loop = EventLoop::new();
event_loop.run(move |event, _, control_flow| {
  /// wait for user interaction before before redrawing
  // *control_flow = ControlFlow::Wait;
  /// run continuously, without waiting for any particular events
  *control_flow = ControlFlow::Poll;
  ... // handle event e.g. key press or redraw request
  if close_requested { // e.g. user pressed `ESC` key
    *control_flow = ControlFlow::Exit; // end the event loop
  }
});
```


### Adding alpha channel

The window that is shown to the user does not have to be a rectangle. If we add an alpha channel, we can create many interesting effects.

`TODO insert image with aplha_composite`

First we need to check if this is supported using [vkGetPhysicalDeviceSurfaceCapabilitiesKHR()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceSurfaceCapabilitiesKHR.html). If the `VkSurfaceCapabilitiesKHR.supportedCompositeAlpha` mask field contains only `VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR`, we are out of luck. 

If this feature is supported, to achieve this effect you need to:

1. Create swapchain with `compositeAlpha=VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR`.
1. Clear swapchain image to `(0,0,0,0)` before each draw.
1. Set pixel alpha when rendering to swapchain image (in shader) e.g. `color1.w = 0.5;`.
1. Enable transparency for your window. In winit, set `.with_transparent(true)`. You can also add `.with_decorations(false)` to remove menubars.

Unfortunately this feature does not always work on all hardware/drivers/OSes. On NVIDIA 1050 Ti, driver version 531.41 and Windows 10, `VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR` is not even needed. I've seen many reports of issues with this functionality. Though there might always be something that I have missed.



### Creating swapchain

Now that we have discussed more interesting options, let's create the `VkSwapchainKHR` object. All we have to do is to provide [VkSwapchainCreateInfoKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSwapchainCreateInfoKHR.html) to [vkCreateSwapchainKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateSwapchainKHR.html). Available fields:

* `VkSwapchainCreateFlagsKHR flags`. Usually `0`, nothing [interesting here](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkSwapchainCreateFlagBitsKHR.html).
* `VkSurfaceKHR surface`. The `VkSurfaceKHR` that we already have.
* `VkFormat imageFormat`. The `VkFormat` that we have selected.
* `VkColorSpaceKHR imageColorSpace`. The `VkColorSpaceKHR` that we have selected.
* `VkExtent2D imageExtent`. 2D size of the image, should be same as your OS window.
* `uint32_t imageArrayLayers`. Usually `1`, unless you are writing VR app that needs separate image for left and right eye.
* `VkImageUsageFlags imageUsage`. Usually `VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT` if you [render to swapchain images using shaders](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDraw.html) or `VK_IMAGE_USAGE_TRANSFER_DST_BIT` if you [copy the pixels from other existing image](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdCopyImage.html). This field is a mask so you can set both using logical OR operation. This use case happens when you want to overlay debug images on top of the finished frame.
* `VkSharingMode imageSharingMode`. Usually `VK_SHARING_MODE_EXCLUSIVE` unless you need to use the image on multiple queue families.
* `uint32_t* pQueueFamilyIndices`. We selected a queue family after calling [vkGetPhysicalDeviceQueueFamilyProperties()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPhysicalDeviceQueueFamilyProperties.html). You can also ignore this setting due to `VK_SHARING_MODE_EXCLUSIVE` sharing mode.
* `VkSurfaceTransformFlagBitsKHR preTransform`. Rotate/mirror image before displaying. I strongly recommend `VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR`. Although you should check `VkSurfaceCapabilitiesKHR.supportedTransforms` and use `VkSurfaceCapabilitiesKHR.currentTransform` as fallback.
* `VkCompositeAlphaFlagBitsKHR compositeAlpha`. We have already discussed alpha compositing. It's usually `VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR`.
* `VkPresentModeKHR presentMode`. The `VkPresentModeKHR` that we have selected.
* `VkBool32 clipped`. Official specification-recommended value is `VK_TRUE`. It allows to skip fragment shader for pixels that are covered by another window.
* `VkSwapchainKHR oldSwapchain`. Previous `VkSwapchainKHR` or `VK_NULL_HANDLE`. Remember that swapchain is associated with `VkSurfaceKHR` and has width/height. So you might have to recreate swapchain after user changes window size or resolution. [vkAcquireNextImageKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAcquireNextImageKHR.html) *should* return error code `VK_ERROR_OUT_OF_DATE_KHR` if that happens.

Carefull readers might notice that I have missed `uint32_t minImageCount`. This setting dictates how many images will be created in a swapchain. Use 2 for double buffering and 3 for triple buffering. Arm's [Choosing the right number of swapchain images](https://arm-software.github.io/vulkan_best_practice_for_mobile_developers/samples/performance/swapchain_images/swapchain_images_tutorial.html) explains the difference, especially condidering choosen `VkPresentModeKHR`.

If the user minimizes the app, it *may* cause resize of the window to one with 0 width and height. This *may* cause `VK_ERROR_OUT_OF_DATE_KHR` as if the user changed window resolution (it does not do this on my PC). To solve this, you can e.g. skip rendering when window is minimized. After the window is visible again, you have no guarantee that the old swapchain can be used. Everything depends on the value from next [vkAcquireNextImageKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAcquireNextImageKHR.html). Nevertheless, it's something that you should handle gracefully. I assume that the exact behaviour is OS-dependent.

After we have created the swapchain, all that is left is to retireve the swapchain images that we will render to.


### Creating swapchain images

To get `VkImage` array for each created swapchain image call [vkGetSwapchainImagesKHR()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetSwapchainImagesKHR.html). In C++ you might want to first query the number of images by setting `pSwapchainImages` to `NULL`.

In Vulkan you rarely operate on a raw `VkImage`. Instead something called image view is used. For example, image with format that supports depth/stencil can have 3 image views. One is used as render target (aspect is `VK_IMAGE_ASPECT_DEPTH_BIT | VK_IMAGE_ASPECT_STENCIL_BIT`). Second when we want to read depth buffer value from shader (aspect is `VK_IMAGE_ASPECT_DEPTH_BIT`). Last could used when we to read only stencil from shader (`VK_IMAGE_ASPECT_STENCIL_BIT`). Other example is collection of 6 images (or, more precisely, 1 `VkImage` with 6 layers). We can create from it an imave view with type `VK_IMAGE_VIEW_TYPE_CUBE` (a cubemap).

There is no much you can configure here:

```rust
let swapchain_image_views: Vec<vk::ImageView> = swapchain_images
  .iter()
  .map(|&swapchain_image| {
    let subresource_range = vk::ImageSubresourceRange::builder()
      .aspect_mask(vk::ImageAspectFlags::COLOR)
      .base_array_layer(0)
      .layer_count(1)
      .base_mip_level(0) // base mipmap level
      .level_count(1) // mip map levels
      .build();
    let create_info = vk::ImageViewCreateInfo::builder()
      .image(swapchain_image)
      .view_type(vk::ImageViewType::TYPE_2D)
      .format(swapchain_image_format)
      .subresource_range(subresource_range)
      .build();
    device
      .create_image_view(&create_info, None)
      .expect("Failed creating image view")
  })
  .collect();
```

In C++ you call [vkCreateImageView()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateImageView.html). I do not have much experience with VR, but I think separate image views for left and right eye are the only use case when `layer_count` would not be 1. And you probably do not have mipmaps other than base level. The only parameter that is not contained in this snippet is `swapchain_image_format`. It's the format that we selected after calling `vkGetPhysicalDeviceSurfaceFormatsKHR()` e.g. `vk::Format::B8G8R8A8_UNORM`.

> The number of created swapchain images is not related to `frames in flight`. This will be discussed in [Vulkan synchronization](#).


## Other miscellaneous Vulkan objects

Most of the Vulkan initialization is behind us. The objects that are left - while important - are quite simple to use. We will explore AMD's Vulkan Memory Allocator in a separate article about [Vulkan resources](#).


### Storing Vulkan commands

To execute operation in Vulkan you record commands to GPU into a `command buffer`. Then you submit the commands to the `queue` using [vkQueueSubmit()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkQueueSubmit.html). Examples of commands include:

* [vkCmdDraw()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDraw.html). Draw triangles.
* [vkCmdDispatch()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdDispatch.html). Dispatch compute shader.
* [vkCmdBindVertexBuffers()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBindVertexBuffers.html), [vkCmdBindIndexBuffer()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdBindIndexBuffer.html). Bind vertex/index buffers before a draw.
* [vkCmdCopyBuffer()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdCopyBuffer.html), [vkCmdCopyImage()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdCopyImage.html). Copy data between buffers/images.
* [vkCmdWriteTimestamp()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCmdWriteTimestamp.html). Used by GPU profilers. We will use this when writing [Simple GPU profiler](#).

As you might notice, first argument is always the `command buffer` to which the command will be recorded. This is a core concept of Vulkan. Recording commands is where most of CPU work will be consumed when drawing the frame.

In a typical Vulkan fashion, before [allocating](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAllocateCommandBuffers.html) `VkCommandBuffer` you need to [create](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateCommandPool.html) `VkCommandPool` first. `VkCommandPoolCreateInfo` has only 2 fields. First is `queueFamilyIndex` that we have selected from the `physical device`. We have already seen this index in a few other places. The second field is [flags](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkCommandPoolCreateFlagBits.html) related to how we are going to use the `command buffers` from this pool. They are a bit more complicated.

`VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT` allows to reset the `command buffer`. If you are going to reuse `command buffers` it's probably a good idea to clear their content before doing so. This can be done by calling `vkResetCommandBuffer` or `vkBeginCommandBuffer`. The second function is more popular as after resetting it also puts the `command buffer` in a recording state. After adding the commands you will have to call matching `vkEndCommandBuffer` to complete recording. As you can see, `VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT` is very useful.

`VK_COMMAND_POOL_CREATE_TRANSIENT_BIT` is used if the command buffers will be short-lived. It's mostly an optimization and you usually can skip it anyway.

I've seen some code that tries to [reset](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkResetCommandPool.html) command pool right after it is created, but this should not be necesary.

To create a `command buffer` call [vkAllocateCommandBuffers()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkAllocateCommandBuffers.html). Beside `command pool` object, it contains only `level` and `commandBufferCount` fields. `VK_COMMAND_BUFFER_LEVEL_PRIMARY` can be submitted to queue, while `VK_COMMAND_BUFFER_LEVEL_SECONDARY` can be 'included' in other `command buffers` to reuse commands. Usually you will only create `command buffers` of `VK_COMMAND_BUFFER_LEVEL_PRIMARY` level. `commandBufferCount` describes how many `command buffers` to create.

The simplest usage of `command buffers` is one for each `frame in flight` to have it's own `command buffer`. At the start of the frame we call `vkBeginCommandBuffer()`. We record some commands. Then we call `vkEndCommandBuffer()` and submit the work to GPU with `vkQueueSubmit()`. Of course, this can get more complicated. For example, if you have multiple threads recording `command buffers` for a single frame you usually have one `command pool` per thread.

> We will explore `frames in flight` in depth in [Vulkan synchronization](#). Reading it will allow you to make more concious decisions regarding `command buffers`.

Let's look at sample Vulkan projects:

* Embark Studios's kajiya [creates separate pool per each command buffer](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-backend/src/vulkan/device.rs#L78). Each frame has `main_command_buffer` and `presentation_command_buffer` that are [reset](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-rg/src/renderer.rs#L135) at the start of `draw_frame()`. Few lines below, it [records and submits main command buffer](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-rg/src/renderer.rs#L159) and then [records and submits the presentation command buffer](https://github.com/EmbarkStudios/kajiya/blob/d373f76b8a2bff2023c8f92b911731f8eb49c6a9/crates/lib/kajiya-rg/src/renderer.rs#L262).
* Arseny Kapoulkine's niagara creates only a [single command buffer](https://github.com/zeux/niagara/blob/5c4da32850ae32a0528f11e22e09ada5348f4e0c/src/niagara.cpp#L590). Every frame it is [reset](https://github.com/zeux/niagara/blob/5c4da32850ae32a0528f11e22e09ada5348f4e0c/src/niagara.cpp#L805), commads are recorded and then the [recording stops](https://github.com/zeux/niagara/blob/5c4da32850ae32a0528f11e22e09ada5348f4e0c/src/niagara.cpp#L1203). Niagara waits for all GPU work to be finished by calling [vkDeviceWaitIdle()](https://github.com/zeux/niagara/blob/5c4da32850ae32a0528f11e22e09ada5348f4e0c/src/niagara.cpp#L1227) every frame. This ensures that profiling timestamps are available before calling `vkGetQueryPoolResults()`.

Alternatively, you can record the command buffers once during the app initialization. Every app parameter is then controlled by uniforms. While not all apps fit this approach, it could be an interesting optimization.

Common pattern in Vulkan is to create a special `setup command buffer`. When uploading data for 3D objects, we might not be able to write to high-performance GPU memory regions directly from CPU. To solve this, we write the data to temporary, CPU-visible memory and use the `setup command buffer` to copy it to the more optimal chunk of memory. We will see this pattern over and over again in [Vulkan resources](#) article.

While command buffers are easy to create there is a bit of theory behind using them efficiently. The rest of the articles in this series will use them extensevily. Be it to [setup synchronization](#), optimize [resource's memory placement](#) or to [draw scene triangles](#). Commands are how you order GPU to do something. And that's kinda a big deal!



## Pipeline cache

In Vulkan, pipeline is used to describe commands that use shaders. In fact, to create a `VkPipeline`, one does need `VkShaderModule`. [Pipeline for compute shaders](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkComputePipelineCreateInfo.html) consists mostly from `VkPipelineShaderStageCreateInfo` (derived from `VkShaderModule`) and description of uniforms bindings (used buffers and image views). Graphic pipeline uses the most complicated Vulkan object - [VkGraphicsPipelineCreateInfo](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VkGraphicsPipelineCreateInfo.html). Beside shader and uniform data, it describes vertex format, viewport size, depth/stencil/blending operations, front face culling and many, many more. There is also separate [vkCreateRayTracingPipelinesKHR](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreateRayTracingPipelinesKHR.html) to create ray tracing pipeline.

`Pipeline cache` is required to create a new `VkPipeline`. As the name suggests it tries to optimize creation of new pipelines. App developer can get the cache content by calling [vkGetPipelineCacheData()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkGetPipelineCacheData.html) and then save it on the hard drive. Call [vkCreatePipelineCache()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/vkCreatePipelineCache.html) to create a new cache. `VkPipelineCacheCreateInfo.pInitialData` is a `void*` pointer to data that you have previously saved on the hard drive. What is the content of the cache? Driver dependend. You can read Arseny Kapoulkine's ["Robust pipeline cache serialization"](https://zeux.io/2019/07/17/serializing-pipeline-cache/) if you need more details. It mentions e.g. how to discard previous cache if the user changed GPU or installed a new driver. Very [entertaining](https://youtu.be/h_TUP2vuaDs?si=lJNA9zHBvZt0TGuR&t=51).


## Summary

`TODO write`

`TODO self-promo other articles`
