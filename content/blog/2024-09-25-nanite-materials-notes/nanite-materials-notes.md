---
title: 'My notes from "Nanite GPU Driven Materials"'
permalink: "/blog/nanite-materials-notes/"
excerpt: "My notes from ["Nanite GPU Driven Materials"](https://media.gdcvault.com/gdc2024/Slides/GDC+slide+presentations/Nanite+GPU+Driven+Materials.pdf) by Graham Wihlidal. Explore the changes in Nanite after Unreal Engine 5.0."
date: 2024-09-25 12:00:00
image: "./nanite-pipeline.jpg"
draft: false
---

`TODO images, header image`


This are my notes from ["Nanite GPU Driven Materials"](https://media.gdcvault.com/gdc2024/Slides/GDC+slide+presentations/Nanite+GPU+Driven+Materials.pdf) by Graham Wihlidal. It was originally presented at GDC 2024 and is now accessible as a PDF. As you have access to the authoritative source there is really a reason to read this. Still, some might find it useful?

> I do not work for or are affiliated with Epic Games in any way. These are all just my personal notes that I made public. If I say "Unreal Engine does X" it's a shorthand.

First, we are going to see the initial Nanite pipeline as presented in ["Nanite A Deep Dive"](https://advances.realtimerendering.com/s2021/Karis_Nanite_SIGGRAPH_Advances_2021_final.pdf) by Brian Karis. We will discuss problems and inefficiencies. We will then use programmable rasterization steps to handle e.g. alpha masks, two sided materials and vertex animation. Shading using compute shaders follows next. We will end with discussion about the new DirectX 12 Work Graphs API.

I assume the reader already has a working knowledge of GPU driven rendering and meshlets. I will skip any explanation of two-pass occlusion culling - it is important, but contributes nothing to what's described. I've also tried to skip Nanite-specific stuff to make it more accessible, although software rasterizer plays a big role in this post. This also applies to terms like "cluster". For Nanite, it refers to a combination of meshlet and per-instance data. I will usually stick to "meshlet" instead.

Feel free to send me an email in case of any errors. Some stuff was simplified, but that's what you would expect.

## Nanite in UE 5.0 (2022)

The presentation starts with the graphic pipeline overview as presented in ["Nanite A Deep Dive"](https://advances.realtimerendering.com/s2021/Karis_Nanite_SIGGRAPH_Advances_2021_final.pdf) by Brian Karis. Here is a simplified version that should be familiar to everyone that worked with GPU driven rendering (again, I skipped two-pass occlusion culling for clarity):

`IMAGE: instance culling -> meshlet culling /-HW_mshlt_list-> HW raster  \-SW_mshlt_list-> SW raster --(vis bufer)--> Material passes`

For the hardware/software rasterizer split, decide based on e.g. projected size of meshlet bounding sphere. Both rasterizers write to the visibility buffer using 64-bit atomic operations (`depth << 32 | clusterId`). But UE5 has shader graphs, which leads to 2 immediate problems:

1. Some materials require special code to decide if/how they write to the visibility buffer. E.g. alpha masks, two-sided materials, vertex animations, etc.
2. You have a visibility buffer and the referenced triangles are shaded using shader graphs. How do you swap between materials?

In UE 5.0, the first problem was not addressed. Objects with special materials were rendered without Nanite. We will see the solution in the `next section`.

`TODO link in 'next section'`

Problem 2 was solved by rendering multiple fullscreen triangles, one for each material. Each draw finds all the pixels that use its material and does the shading only for them. As draw commands are executed from the CPU, we might have commands that do nothing. E.g. the renderer does a draw with material id for a chair. But, after GPU culling, there are no pixels with this material. What if you did a pipeline state object (PSO) or descriptor change for nothing?

Known optimization writes `materialId` to `SV_Depth`. The fullscreen triangle can test `depth_equals` to reject pixels with early depth-stencil test. This approach was [used in Eidos Montreal's Dawn Engine](https://www.eidosmontreal.com/news/deferred-next-gen-culling-and-rendering-for-dawn-engine/):


> "In an initial geometry pass, all mesh instances, that pass the GPU culling stage, are rendered indirectly and their vertex attributes are written, compressed, into a set of geometry buffers. No material specific operations and texture fetches are done (except for alpha-testing and certain kinds of GPU hardware tessellation techniques). A subsequent full screen pass transfers a material ID from the geometry buffers into a 16-bits depth buffer. Finally, in the shading pass for each material, a screen space rectangle is rendered that encloses the boundaries of all visible meshes. The depth of the rectangle vertices is set to a value that corresponds to the currently processed material ID and early depth-stencil testing is used to reject pixels from other materials."


`IMAGE - image 2 from article above: "Current version of the official blogpost is missing the crucial image. I've retrieved it from [web.archive](https://web.archive.org/web/20220305140355/https://www.eidosmontreal.com/news/deferred-next-gen-culling-and-rendering-for-dawn-engine/) cache. All rights to the image belong to Eidos Montreal."`



Later on, the technique was optimized using 64x64 tiles. There are 2 possible approaches.

First, compute a list of materials for each tile. Then, for each material, draw all tiles. The vertex shader returns bogus coordinates if the tile does not contain pixels affected by the material. Or the usual NDC tile coordinates if it does. With a single memory read we can skip depth tests for 64x64 pixels.

Alternatively, create a list of tiles per material. We still use draw indirects, but tile index is used to grab an entry from the current material's tile list. Each entry maps to the tile's location.


## Programmable Raster in UE 5.1 (2022)

> See ["Bringing Nanite to Fortnite Battle Royale in Chapter 4"](https://www.unrealengine.com/en-US/tech-blog/bringing-nanite-to-fortnite-battle-royale-in-chapter-4) for extra info beside the slides.

As mentioned above, Nanite in UE5 did not handle following material properties:

1. Alpha masking (grass, trees). Conditionally skip write to visibility buffer based on texture.
	1. Leaves in Fortnite seem to [still use geometry instead of alpha masks](https://www.unrealengine.com/en-US/tech-blog/bringing-nanite-to-fortnite-battle-royale-in-chapter-4).
2. Two-sided materials. Write to visibility buffer despite "incorrect" triangle winding.
3. Pixel depth offset. Modify written depth.
4. Vertex animation (UE5's WPO - world position offset, e.g. wind, animated reactions). Modify write coordinates inside the visibility buffer.
5. Custom UVs. Not explained.
6. ...

All of these effects interact with the visibility buffer or modify values written to it. Looking back at the Nanite pipeline, it's obvious we need to make rasterization stages configurable.

`IMAGE same as above`

As we have both hardware (HW) and software (SW) rasterization, we have to handle all of the 5+ effects in both variants. This number can explode if you need separate descriptors.

For two sided materials, HW rasterization just requires PSO change from `CULL_BACKFACE` to `CULL_NONE`. For SW raster, you can just swap 2 vertex indices with each other to revert the winding if needed. In shader, you usually have an `if` that culls the entire triangle and then 3 calls to `edgeFunction()` inside the for-loops (unless using `Ax + By + C` optimization). Both places are affected.

For alpha masking, HW rasterization can just sample the texture. SW rasterization requires barycentric coordinates, derivatives and mipmap calculation.

Unique combination of material properties and descriptors that affect rasterization for HW/SW technique is called `raster bin`. You might also notice that the CPU, once again, will dispatch/draw indirect all possible combinations of raster bins, as it does not know what has made through the GPU culling. If material exists in the scene we dispatch both HW and SW rasterizer for it. It might even happen that all of the material's meshlets are processed by only one of them, rendering either HW or SW rasterizer jobless. 

Meshlet might also contain triangles with different materials.

All that is left is to create compute passes that, for each raster bin, outputs a list of meshlets.

`IMAGE new pipeline with raster pases`


### Sorting into raster bins

Meshlet culling produces 2 lists of meshlets - one for hardware and one for software rasterizer. All we need to do is to sort both lists into raster bins. This way, draw/dispatch for each shader bin will fetch its own subset of the list.

If you've ever done GPU sorting into bins, you already know the implementation. If you don't, here is code from my [Frostbitten hair WebGPU](https://github.com/Scthe/frostbitten-hair-webgpu) that sorts screen tiles based on the number of hair segments:

1. [Count tiles for each bin](https://github.com/Scthe/frostbitten-hair-webgpu/blob/master/src/passes/swHair/hairTileSortPass.countTiles.wgsl.ts).
2. [Write tiles to array based on their bin](https://github.com/Scthe/frostbitten-hair-webgpu/blob/master/src/passes/swHair/hairTileSortPass.sort.wgsl.ts).

As you can see, it's not complicated. In UE5 there are 3 stages:

1. **Classify** dispatches a thread per cluster. Increments global counter for each raster bin present.
2. **Reserve** dispatches a thread per raster bin. Used to calculate memory offsets in the **array that contains `vec2u` elements** (`i32 clusterIdx`, `i16 triangleIdx start`, `i16 triangleIdx end`).
	* Example implementation: there is a global `offsetCounter` and each raster bin atomically adds its cluster count. This functions as memory space reservation.
	* Also initializes indirect arguments for rasterization draws/dispatches.
3. **Scatter** dispatches thread per cluster. Fills the array based on reserved memory offsets.

Note that each dispatch/draw has to know its slice of the meshlet list - both offset and count. I've also hand waved some other issues - see slides. E.g. you can use async compute. The barrier configuration seems atypical.

This is enough for each draw/dispatch to rasterize its assigned triangles.


## Compute shading in UE 5.4 (2024)

We will now look at the later stage of the pipeline - shading. 

`IMAGE pipeline, arrow pointing to shading`

All the shading was moved to compute shaders - see slides 59 and 60 for potential problems. While this approach has some performance advantages over fullscreen passes (dispatches are cheaper for empty workload, no [context rolls](https://gpuopen.com/learn/understanding-gpu-context-rolls/), access to workgroups, no longer bound by 2x2 quads), the naive implementation will be slower than the one from UE 5.0. Let's see how sorting pixel locations into **shading bins** can improve this .

### Sorting into shading bins

The slides do not provide a definition of a shading bin. Let's use a simplest one: a unique material (for simplicity we are not even considering different triangles, etc.). We will revisit this definition later. Our goal is to generate a list of pixel locations for each material. This only requires an allocation of size `screenPixelCount * vec2<u32>` (and a separate buffer for per material offset and count). The algorithm is similar to one for raster bins and has following stages:

1. **Count** dispatches a thread per 2x2 pixel region (a **quad**). Counts number of pixels per shading bin.
2. **Reserve** dispatches a thread per shading bin. Used to calculate memory offsets in the previously mentioned array. This functions as memory space reservation.
	* Also initializes indirect arguments for each shading dispatch.
3. **Scatter** dispatches a thread per 2x2 pixel region. Fills the aforementioned array with pixel locations based on reserved memory offsets.
	* Dispatched as 8x8 workgroup called **block** (so 16x16 pixels). Threads are assigned to quads inside the workgroup using Morton code.
	* All pixels inside a workgroup (so 16x16 pixels area) that share the same shading bin are located next to each other in the final array. Thus, for each shading bin:
		1. Count pixels from a particular shading bin.
		2. Do a single atomic add for this shading bin for this workgroup.
		3. Broadcast the start offset from atomic add.
		4. Each thread calculates offsets into the array and writes.

> You might have seen nearly the same algorithm in John Hable's ["Visibility Buffer Rendering with Material Graphs"](http://filmicworlds.com/blog/visibility-buffer-rendering-with-material-graphs/). I've added comments relevant to UE 5.4's implementation.

With this, our memory array of size `screenPixelCount * vec2<u32>` contains pixel locations sorted by material. Two `u32` are more than enough, so I don't think it's the only data that is stored. As each thread processes 2x2 quad, some additional **Variable Rate Shading (VRS)** data is also packed. At slide 73 this is confirmed - **quad write mask** is also stored. We certainly have enough data to make a VRS decision (slide 101) for all 4 pixels.

At slide 68 there is a note about [Delta Color Compression (DCC)](https://gpuopen.com/learn/dcc-overview/). I'm not exactly sure how this plays with the rest of the algorithm, especially VRS.


### Shading passes

We are finally ready to evaluate shader graphs to populate GBuffer. The simplest solution is, for each material, do an indirect dispatch where 1 thread == 1 pixel. Use push constants (Vulkan) or root constants (DirectX 12) to provide the materialId that is used to fetch a list of affected pixels. You might notice we still have dispatches that will affect 0 pixels. The CPU only knows that the material exists in the scene. It does not know that all affected triangles might have been culled. It's the 3rd time we see this problem.


### Quads optimization

As the scatter stage assigned a thread per 2x2 quad, **if all 4 pixels share same material, they will be stored next to each other**. Shading pass can detect this using the quad write mask and use for optimizations. E.g. you still have to calculate gradients (ddx/ddy/fWidth/mipmaps, see slides 73-86). I think such special 2x2 encoding optimization is what's presented on slide 88.

Or we could try to implement simple Variable Rate Shading. If all 4 pixels share the same material, the scatter pass would store only the top left pixel with an appropriate quad write mask (instead of all 4 pixels). You don't even need to dispatch threads for these 3 skipped pixels (change in indirect dispatch arguments). If you want, you can extend this to handle special cases for 2x1 and 1x2. See slide 104 for visual examples.

> I recommend John Hable's ["Software VRS with Visibility Buffer Rendering"](http://filmicworlds.com/blog/software-vrs-with-visibility-buffer-rendering/) if you need a refresher on quad utilization and helper lanes.


### Locality in shading bins

Let's go back to the definition of shading bins, this time using slide 69:

`IMAGE slide 69`

Instead of a list of pixels per material, the array seems to be split based on the amount of pixels of the same material in a block. Blocks that have only a single materialId are allocated to the front of the list. The remaining pixels are written at the back of the array.

I would assume this achieves following:
* better data locality,
* easier to detect bigger blocks of same material,
* maybe better scheduling as most of the work is executed upfront?

I have to say that this setup looks a bit strange. The reasoning is probably clear to people who have already implemented such systems. I did not. I remember when I first watched ["Every Strand Counts: Physics and Rendering Behind Frostbite’s Hair"](https://youtu.be/ool2E8SQPGU?si=DzqqwYYuaSTav-nS&t=1564) (by Robin Taillandier and Jon Valdes) I was wondering why processors were used to process tiles. During implementation it took me 3 key strokes to realize that allocating `screenPixelCount * numberOfSlicesPerPixel(let's say 32) * sizeof(u32)` is not the greatest idea.



At this point the presentation goes deeper into Variable Rate Shading, which would have been a separate article on its own. However, I'm not interested in this subject. Although it would probably explain a lot..



## Empty bin compaction with work graphs

> We are back at slide 109

We have already encountered the same problem 3 times: empty indirect draws and dispatches. The UE 5.0's implementation draws fullscreen triangles for each material. They produced no pixels if its meshlets were culled. In raster binning we had software and hardware rasterizer commands that processed 0 meshlets. Again, some meshlets were culled. Or maybe all were assigned to software rasterizer, rendering hardware rasterizer useless? In compute shading we once again did empty dispatches for materials that never affect anything.

If the GPU is already doing something, the empty dispatches might not be a problem. Unfortunately, according to the screenshots, sometimes 3075 shading bins out of 3779 were empty (81%).

`IMAGE slide 130`


The presentation provides a solution for consoles. Epic Games also tried to use [ID3D12GraphicsCommandList::SetPredication()](https://learn.microsoft.com/en-us/windows/win32/api/d3d12/nf-d3d12-id3d12graphicscommandlist-setpredication) on DirectX 12, but the PSO (and descriptors) change proved too costly.

The solution (as some people have heard from news) is to use DirectX 12 Work Graphs. Let's be honest, you can't expect me to explain this feature. All I know is that it allows you to dispatch/schedule a separate shader from another.

Here is a quote by Graham Wihlidal from official release of D3D12 Work Graphs 6 months ago:

>"With Work Graphs, complex pipelines that are highly variable in terms of overall “shape” can now run efficiently on the GPU, with the scheduler taking care of synchronization and data flow. This is especially important for producer-consumer pipelines, which are very common in rendering algorithms. The programming model also becomes significantly simpler for developers, as complex resource and barrier management code is moved from the application into the Work Graph runtime."

And here is a screenshot from relevant [DirectX-Specs](https://github.com/microsoft/DirectX-Specs/blob/master/d3d/WorkGraphs.md) introduction:

`IMAGE from https://github.com/microsoft/DirectX-Specs/blob/master/d3d/WorkGraphs.md`

That sounds like a good fit to solve the problem. I assume other parts of Nanite might make use of it too.

## Summary

Originally, I'd only read the presentation as I wanted to know how Nanite was extended. Turns out most of the covered topics can be broadly applied. Although the changes to software rasterizer are another interesting aspect of this technique.

The programmable raster was not surprising. Once you think in terms of "alpha masks can be implemented by not writing selected pixels to the visibility buffer", most of the solution falls in line. Ofc. there are more complex use cases and converting the shader graph system (or just affected properties) was probably a lot of work.

The compute shading and (especially) Variable Rate Shading are (for me) a bit too complex and far removed from the initial Nanite problem. Remember, I look at this from a perspective of [tiny web app](https://github.com/Scthe/nanite-webgpu), which is already limited by lack of 64-bit atomics and early depth-stencil tests.

The DirectX 12 Work Group API thing was interesting. I heard the news when it was first released. It's nice to know why this solution exists.