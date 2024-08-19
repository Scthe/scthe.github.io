---
title: "My thoughts on Nanite after \"Nanite WebGPU\""
permalink: "/blog/nanite-report/"
excerpt: "My thoughts on UE5's Nanite after I reimplemented it. Article is inside the project's git repo."
date: 2024-08-16 12:00:00
image: "./scene-jinx.jpg"
draft: false
---

> Read more in the [Nanite WebGPU repo](https://github.com/Scthe/nanite-webgpu).


Recently I've finished [Nanite WebGPU](https://github.com/Scthe/nanite-webgpu). It's a web browser implementation of [UE5's Nanite](https://www.youtube.com/watch?v=qC5KtatMcUw&t=97s). It includes the meshlet LOD hierarchy, software rasterizer (at least as far as possible given the current state of WGSL), and billboard impostors. Culling on both per-instance and per-meshlet basis (frustum and occlusion culling in both cases). Supports textures and per-vertex normals. Possibly every statistic you can think of. There is a slider or a checkbox for every setting imaginable. Also works offline using Deno.

With the code, I've also published [my analysis of Nanite](https://github.com/Scthe/nanite-webgpu?tab=readme-ov-file#faq). It is in the repo's README.md. I assume more people would not have bothered to click a link to this blog.
