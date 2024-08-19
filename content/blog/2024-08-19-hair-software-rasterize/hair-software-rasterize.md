---
title: "Software rasterizing hair"
permalink: "/blog/hair-software-rasterize/"
excerpt: "."
date: 2024-08-19 12:00:00
image: "./.jpg"
draft: false
---

```js
TODO
- metadata
- re-read
- simplify
- grammarly
- insert images
```

In last few years we have seen more rendering systems that lean on software rasterization. It's an optimal choice for small triangles (~1 px wide) or thin triangles than span multiple pixels in a single direction. Two of most known practical examples are [UE5's Nanite](https://advances.realtimerendering.com/s2021/Karis_Nanite_SIGGRAPH_Advances_2021_final.pdf#page=81) (which I've reimplemented in [Nanite WebGPU](https://github.com/Scthe/nanite-webgpu)) and [Frostbite's hair system](https://www.youtube.com/watch?v=ool2E8SQPGU) (which I've reimplemented in [Frostbitten hair WebGPU](https://github.com/Scthe/frostbitten-hair-webgpu)). Basic software rasterization for triangles has been already describes countless times e.g.:

* ["The barycentric conspiracy"](https://fgiesen.wordpress.com/2013/02/06/the-barycentric-conspirac/) and ["Optimizing the basic rasterizer"](https://fgiesen.wordpress.com/2013/02/10/optimizing-the-basic-rasterizer/) by Fabian "ryg" Giesen.
* ["Rasterization"](https://www.scratchapixel.com/lessons/3d-basic-rendering/rasterization-practical-implementation/rasterization-stage.html) by Scratchapixel.
* ["Rasterising a triangle"](https://jtsorlinis.github.io/rendering-tutorial/) by Jason Tsorlinis.

In this article we will see the rasterization algorithm for hair. Starting from file that contains strand points in 3D space and ending on pixel attributes inside a quad. First we will see required 3D transformations to produce projected vertices. Then we will go over triangle rasterization basics, and see same function applied to quads. We will also need coordinates inside each rasterized hair segments to compute attributes.

`IMAGE screen from Frostbitten hair WebGPU to show what we are doing. Also as main article image in metadata`

## Basic terminology

Let's go over some terminology:

* **Hair strand**. Single hair that is anchored to the head at **root** point and ends at a **tip** point.
* **Points**. Each strand contains same number of points in strand. First point is always the root, last is the tip.
* **Segments**. Fragment of the strand between 2 consecutive points. If the strand has N points, it has N-1 segments.
* **Tangent**. Normalized vector from $point_i$ to $point_{i+1}$. Usually you have separate GPU buffer with tangents.

`IMAGE basic hair terminology`


## Projecting spline points

In Blender, hair is a collection of splines. Splines have control points. I assume everyone has seen the smoothness of bezier curves, etc. Realtime representations usually quantisize each strand into a discrete points. I do it in [my Blender exporter](https://github.com/Scthe/frostbitten-hair-webgpu/blob/master/scripts/tfx_exporter.py). **Number of points per strand** is customizable and depends on the hairstyle. Short hair can get away with as little as 3 points. My [Frostbitten hair WebGPU](https://scthe.github.io/frostbitten-hair-webgpu) uses 16 points per strand. Increasing number of points will always increase complexity (usually linear change for simulation), but will provide smoother look. The rendering performance hit depends on selected technique. For example, in Frostbite's-like, the cost evaluation is quite complicated. While you have to process more segments in the tile pass, the fine pass often reaches sufficient "opaqueness" to early return during the processing. And this optimization happens regardless of strand count.

But the question now stands: "How to turn connected points into pixel coordinates?". We will be using billboards that have width controlled by `fiberRadius` parameter. Increasing `fiberRadius` makes each strand wider.


### Projecting hair as billboards

Billboards always face the player. They are a plane whose normal always points toward the camera. We can calculate the vertex coordinates inside shader. For each hair point we have a tangent vector that points toward next point. The last point (tip) for each strand usually has same tangent as it's predecessor. From the definition of the [cross product](https://en.wikipedia.org/wiki/Cross_product) we can find a vector that is perpendicular to both the tangent and the toward-camera vector. The coordinates for 2 vertices are given by moving along this vector scaled by `fiberRadius` and `-fiberRadius`. All that is left is to multiply by view-projection matrix.

`IMAGE from unity article`

```rust
struct ProjectedStrandPoint {
  v0: vec2f, // in pixels
  v1: vec2f, // in pixels
  depth0: f32,
  depth1: f32,
}

let segmentStartPoint = projectHairPoint(strandIdx, pointIdx);
let segmentEndPoint   = projectHairPoint(strandIdx, pointIdx + 1);


fn projectHairPoint(strandIdx: u32, pointIdx: u32) -> ProjectedStrandPoint {
  // position
  let p_OBJ = _getHairPointPosition(_pointsPerStrand, strandIdx, pointIdx).xyz;
  let p_WS: vec4f = _modelMat * vec4f(p_OBJ, 1.0);
  // tangent
  let t_OBJ = _getHairTangent(_pointsPerStrand, strandIdx, pointIdx).xyz
  let t_WS: vec4f = _modelMat * vec4f(t_OBJ, 1.0);
  
  // Calculate bitangent vector
  // (cross between tangent and to-camera vectors)
  let towardsCamera: vec3f = normalize(_cameraPositionWS.xyz - p_WS.xyz);
  let right: vec3f = normalize(cross(t_WS.xyz, towardsCamera)).xyz * _fiberRadius;
  let v0_WS = vec4f(p_WS.xyz - right, 1.0);
  let v1_WS = vec4f(p_WS.xyz + right, 1.0);
  let v0_NDC: vec3f = projectVertex(_viewProjMat, v0_WS);
  let v1_NDC: vec3f = projectVertex(_viewProjMat, v1_WS);
  
  return ProjectedStrandPoint(
    ndc2viewportPx(_viewportSize.xy, v0_NDC),
    ndc2viewportPx(_viewportSize.xy, v1_NDC),
    v0_NDC.z,
    v1_NDC.z
  );
}

fn projectVertex(mvpMat: mat4x4f, pos: vec4f) -> vec3f {
  let posClip = mvpMat * pos;
  let posNDC = posClip / posClip.w;
  return posNDC.xyz;
}

fn ndc2viewportPx(viewportSize: vec2f, pos: vec3f) -> vec2f {
  let pos_0_1 = pos.xy * 0.5 + 0.5; // to [0-1]
  return pos_0_1 * viewportSize.xy;
}
```

You might be considering calculating the `right` vector in view space with `let towardsCamera = vec3f(0, 0, 1)`. It will not work. Half of the strands will render with `towardsCamera.z = 1`, the rest with `towardsCamera = -1`. I'm not sure why (view space is weird), so I just switched to world space calculations.

For each segment (consisting of start and end points) we now have 4 projected points. Use them as vertices in quad rasterization.



## Software rasterization

First we will find a way to check on which side of a line the point lies. With 3 lines this function allows to rasterize a triangle. With 4 lines we get quad.


### Edge function

We start with a line $y=1$ and a point $p=(4, 3)$. Our goal is to check on which side of the line the point lies. Let's mark 2 points on this line: $a=(0,1)$, $b=(4,1)$ and calculate area of triangle $a, b, p$ using [Shoelace formula](https://en.wikipedia.org/wiki/Shoelace_formula):

$$
A = \frac{1}{2} \cdot [{(x_b - x_a)(y_p-y_a) - (y_b-y_a)(x_p-x_a)}]
$$
`IMAGE example image with concrete points`

Plugging the values:

$$
A_1 = \frac{1}{2} \cdot [(4-0)(3-1) - (1-1)(4-0)]
$$

$$
A_1 = \frac{1}{2} \cdot [4 \cdot 2 - 0] = 4
$$
Let's try swapping coordinates for points $a$ and $b$:

`IMAGE example image with concrete points - 2`
$$
A_2 = \frac{1}{2} \cdot [(0 - 4)(3 - 1) - (1 - 1)(4 - 4)]
$$
$$
A_2 = \frac{1}{2} \cdot [-4 \cdot 2 - 0] = -4
$$
Wait, how can an area of a triangle be negative? Well, you are supposed to take the absolute value here. But that was not our goal. We are only interested in why did the sign switch.

Let's now consider relative positions of the 3 points. In first example, imagine you are standing on point $a$ and looking toward point $b$ (along the green arrow). Then, the point $p$ is on your left side. Repeat this after swapping positions of points $a$, $b$ (again, look at the green arrow). The point $p$ is now on the right side. Generalizing this observation, the **edge function** results in one of 3 outcomes:

* If value is **negative**, then the point lies **on one side** of the line.
* If value is **positive**, then the point lies **on other side** of the line.
* If value is 0, then the point lies on the line.

> You might also notice that the result depends on clockwise/counterclockwise order of vertices. This is useful for triangle culling. We will not use this property for hair.

### Using edge function to rasterize triangles

Now we can check on which "side" of the line a point (or a pixel) lies. If we have 3 lines, there will be an area that lies on same side of each line.

`IMAGE 3 lines with marked "outsides" create a triangle`

This how the simplest triangle rasterization works. For each pixel in the canvas, calculate value for all 3 edge functions and check if **all** are negative or positive. You can optimize this by calculating triangle bounds. For triangle that spans on vertices `v0`, `v1`, `v2` write following rasterization code:

```rust
var boundRectMin = floor(min(min(v0, v1), v2));
var boundRectMax = ceil (max(max(v0, v1), v2));
// scissor
boundRectMin = max(boundRectMin, vec2(0));
boundRectMax = min(boundRectMax, _viewportSize.xy);

for (var y = boundRectMin.y; y < boundRectMax.y; y += 1) {
for (var x = boundRectMin.x; x < boundRectMax.x; x += 1) {
  let p = vec2f(x, y); // floats. See below for sampling offset
  let C0 = edgeFunction(v2, v1, p); // v2, v1 order depends on CW/CCW
  let C1 = edgeFunction(v0, v2, p);
  let C2 = edgeFunction(v1, v0, p);
  
  if (C0 >= 0 && C1 >= 0 && C2 >= 0) {
    // pixel inside triangle v0, v1, v2
    putPixel(p, COLOR_BLUE);
    }
}}


fn edgeFunction(v0: vec2f, v1: vec2f, p: vec2f) -> f32 {
  return (p.x - v0.x) * (v1.y - v0.y) - (p.y - v0.y) * (v1.x - v0.x);
}
```

Most of the time you would also use result of `edgeFunction()` to compute barycentric coordinates. This article focuses on hair (rendered as quads), and we will not use this property.

### Half of the pixel offset

Another issue is sampling. If you take a single sample per pixel, you should offset $p$ by `vec2f(0.5, 0.5)` to sample in the center of the pixel. If you are using multisampling, you should apply appropriate offset to each sample. Read the specification for your graphic API to get exact values. Some APIs allow to provide custom sampling pattern e.g. [VK_EXT_sample_locations()](https://registry.khronos.org/vulkan/specs/1.3-extensions/man/html/VK_EXT_sample_locations.html). This is important if e.g. you are mixing hardware and software rasterization, e.g. by using depth buffer.

> While you are at it, you should also check the exact [triangle rasterization rules](https://learn.microsoft.com/en-us/windows/win32/direct3d11/d3d10-graphics-programming-guide-rasterizer-stage-rules#triangle-rasterization-rules-without-multisampling) (e.g. top-left rule, etc.).

`IMAGE screen from WebGPU spec - https://www.w3.org/TR/webgpu/#rasterization`


### Using edge function to rasterize quads

Rasterizing quads is much more complicated. You have to call `edgeFunction()` 4 times.

`IMAGE 4 lines with quad marked inside`

```rust
var boundRectMin = floor(min(min(v00, v01), min(v10, v11)));
var boundRectMax = ceil (max(max(v00, v01), max(v10, v11)));
// scissor
boundRectMin = max(boundRectMin, vec2(0));
boundRectMax = min(boundRectMax, viewportSize.xy);

for (var y = boundRectMin.y; y < boundRectMax.y; y += 1) {
for (var x = boundRectMin.x; x < boundRectMax.x; x += 1) {
  let p = vec2f(x, y); // floats
  let C0 = edgeFunction(v01, v00, p);
  let C1 = edgeFunction(v11, v01, p);
  let C2 = edgeFunction(v10, v11, p);
  let C3 = edgeFunction(v00, v10, p);
  
  if (C0 >= 0 && C1 >= 0 && C2 >= 0 && C3 >= 0) {
    // pixel inside quad v00, v01, v10, v11
    putPixel(p, COLOR_LIGHT_PURPLE);
    }
}}
```


> The notation for `v0-` and `v1-` is based on the original point inside hair segment. `v0-` denotes vertices near the start of the hair segment. `v1-` denotes vertices near the end of the hair segment.

At this point you should be able to software rasterize hair based on imported strand points.


### Optimization (or not)

Let's look at the edge function again:
$$
f = (x_b - x_a)(y_p-y_a) - (y_b-y_a)(x_p-x_a)
$$
We are then iterating over $p=(x_p, y_p)$. A common optimization is to write the edge function a form that matches $f = A \cdot x_p + B \cdot y_p + C$. This way, when we iterate over successive pixels in a row (only $x_p$ changes) we can just add $A$. The $B \cdot y_p + C$ part does not change. No reason to evaluate whole edge function again. Similar when switching to the next row. The code below might might be helpful at this point.

There are 3 edges, so we have to precompute 3 different values of A, B, C. Given 2 vertices, we have following formulas:

$$
A = y_a - y_b
$$

$$
B = x_b - x_a
$$

$$
C = x_a \cdot y_b - y_a \cdot x_b
$$

> Invert the signs for clockwise/counterclockwise conversion.

For triangles, this is around 7% faster. Measured in one of the test scenes in [Nanite WebGPU](https://github.com/Scthe/nanite-webgpu).

Since quad has 4 edges, we precompute 4 sets of A, B, C. Unfortunately, this is quite a lot of registers. In "Frostbitten hair WebGPU", [HairFinePass](https://github.com/Scthe/frostbitten-hair-webgpu/blob/d6306a69ab1cde4ef1321fc98c2040fd64ccac37/src/passes/swHair/shaderImpl/processHairSegment.wgsl.ts#L39) uses this optimization, while [HairTilesPass](https://github.com/Scthe/frostbitten-hair-webgpu/blob/d6306a69ab1cde4ef1321fc98c2040fd64ccac37/src/passes/swHair/shaderImpl/tilePassesShared.wgsl.ts#L57) does not. Quad rasterization if you use this optimization:

```rust
let CC0 = edgeC(v01, v00);
let CC1 = edgeC(v11, v01);
let CC2 = edgeC(v10, v11);
let CC3 = edgeC(v00, v10);
var CY0 = boundRectMin.x * CC0.A + boundRectMin.y * CC0.B + CC0.C;
var CY1 = boundRectMin.x * CC1.A + boundRectMin.y * CC1.B + CC1.C;
var CY2 = boundRectMin.x * CC2.A + boundRectMin.y * CC2.B + CC2.C;
var CY3 = boundRectMin.x * CC3.A + boundRectMin.y * CC3.B + CC3.C;

for (var y: f32 = boundRectMin.y; y < boundRectMax.y; y += 1.0) {
  var CX0 = CY0;
  var CX1 = CY1;
  var CX2 = CY2;
  var CX3 = CY3;
  for (var x: f32 = boundRectMin.x; x < boundRectMax.x; x += 1.0) {
    if (CX0 >= 0 || CX1 >= 0 || CX2 >= 0 || CX3 >= 0) {
      // pixel inside quad v00, v01, v10, v11
      putPixel(p, COLOR_IRIS);
    }

    CX0 += CC0.A;
    CX1 += CC1.A;
    CX2 += CC2.A;
    CX3 += CC3.A;
  }
  CY0 += CC0.B;
  CY1 += CC1.B;
  CY2 += CC2.B;
  CY3 += CC3.B;
}

struct EdgeC{ A: f32, B: f32, C: f32 }

fn edgeC(v0: vec2f, v1: vec2f) -> EdgeC{
  // from edgeFunction() formula we extract: A * p.x + B * p.y + C.
  // This way, when we iterate over x-axis, we can just add A for
  // next pixel, as the "B * p.y + C" part does not change.
  // Uses WebGPU vertex ordering (signs inverted wrt. math above)
  var result: EdgeC;
  result.A = v1.y - v0.y; // for p.x
  result.B = -v1.x + v0.x; // for p.y
  result.C = -v0.x * v1.y + v0.y * v1.x; // rest
  return result;
}
```


## Not-barycentrics

This leaves us with just one question: "How do we calculate barycentric coordinates for pixels inside the quad?". Well, we don't. For hair, we need coordinates in "segment space", according to 2 perpendicular axis. I'm not sure if there is some industry-standard algorithm for this. I've used my own. I will highlight where it has some issues. You can always check the demo page for [Frostbitten hair WebGPU](https://scthe.github.io/frostbitten-hair-webgpu) to see how big of a problem it is in practise. A lot of value is in realizing what problem we are trying to solve.

`IMAGE u, v in segment space`

> There are algorithms to calculate barycentric coordinates in a quad. I spend 2h trying to get them to work. This was one of first days of writing "Frostbitten hair WebGPU". Since I still had the whole app to write, I decided to just roll something good-enough so I can get to actually complicated parts. I did not change it later and is present in the current version.

I will explain derivation of both values and you can find complete code at the end.


### Calculation for long axis

1. Calculate a line that goes through start and end points of the segment.
2. Project the pixel onto the line.
3. Calculate distance from the segment start point to the projected pixel.
4. Divide this distance by segment length. Saturate the result so that it is between 0 and 1.

`IMAGE`

Looking at the image, there are obvious flaws. Pixel $px_1$ is projected beyond the end segment. It requires the call to `saturate()`. The value for $px_2$ is also incorrect. The perceived error depends on the hair width and angle between subsequent tangents. It's not noticeable as the hair is thin and most rendering techniques provide anti-aliasing using transparency. If you have more time, you should definitely research this more. Or debug barycentric coordinates.


### Calculation for short axis

Given the value for the long axis, it's easier to get the second value. Notice is that the segment's end width depends on the tangent of the next segment. Only last segment near strand tip has same width near both points.

`IMAGE`

1. Calculate `width near the segment's end`.
2. Calculate the projected `width near the segment's end` using [scalar projection](https://en.wikipedia.org/wiki/Scalar_projection) (dot product).
3. Strand `width near the pixel` is a linear interpolation of start and end width using the coordinate for long axis.
4. Project the pixel onto one of the side edges of the segment.
5. Calculate distance from the pixel to the projected pixel.
6. Divide this distance by segment `width near the pixel`. Saturate the result so that it is between 0 and 1.

### Code

```rust
struct ProjectedSegment {
  v00: vec2f,
  v01: vec2f,
  v10: vec2f,
  v11: vec2f,
}

/**
 * result[0] - value in 0-1 range along the width of the segment.
 *             0.0 means on the one side edge, 1.0 is on the other one
 * result[1] - value in 0-1 range along the length of the segment,
 *             0.0 is near the segment start point,
 *             1.0 is near the segment end point
 */
fn interpolateHairQuad(projSeg: ProjectedSegment, pxPos: vec2f) -> vec2f {
  // vertices for edge at the start of the segment: projSeg.v00 , projSeg.v01
  let startEdgeMidpoint = (projSeg.v00 + projSeg.v01) / 2.0;
  // vertices for edge at the end of the segment: projSeg.v10 , projSeg.v11
  let endEdgeMidpoint = (projSeg.v10 + projSeg.v11) / 2.0;
  
  // project the pixel onto the line that crosses both segment points
  let cProjected = projectPointToLine(startEdgeMidpoint, endEdgeMidpoint, pxPos);
  // normalized distance from the start of the strand's segment. Range: [0..1]
  let d1 = saturate(
      length(cProjected - startEdgeMidpoint) /
      length(endEdgeMidpoint - startEdgeMidpoint));
  
  // start edge is perpendicular to tangent of the current segment
  let widthStart = length(projSeg.v00 - projSeg.v01);
  // 'End' edge is at the angle to segment's tangent.
  // It's direction is determined by the NEXT segment's tangent.
  // Project the 'end' edge onto the 'start' edge
  // using the geometric definition of dot product.
  let widthEnd = widthStart * dot(
    normalize(projSeg.v00 - projSeg.v01),
    normalize(projSeg.v10 - projSeg.v11)
  );
  let expectedWidth = mix(widthStart, widthEnd, d1);
  // project pixel onto one of the side edges
  let e1 = projectPointToLine(projSeg.v00, projSeg.v10, pxPos);
  // distance between pixel and it's projection on the edge.
  // Divided by full width of the strand around that point
  let d0 =  saturate(length(pxPos - e1) / expectedWidth);

  return vec2f(d0, d1);
}

/** https://stackoverflow.com/a/64330724 */
fn projectPointToLine(l1: vec2f, l2: vec2f, p: vec2f) -> vec2f {
  let ab = l2 - l1;
  let ac = p - l1;
  let ad = ab * dot(ab, ac) / dot(ab, ab);
  let d = l1 + ad;
  return d;
}
```

## Summary

In this article we have seen how to turn hair splines into realtime rendered pixels. Used techniques are not complicated, but their application is rarely discussed. Given recent spotlight on software rasterization, many companies will move in this direction. Due to inherent complexity, hair rendering is it's own separate subsystem. The knowledge from this article should be enough to start implementing techniques from Robin Taillandier and Jon Valdes's ["Every Strand Counts: Physics and Rendering Behind Frostbite’s Hair"](https://www.youtube.com/watch?v=ool2E8SQPGU). And after watching the presentation you can move straight into the codebase of my [Frostbitten hair WebGPU](https://github.com/Scthe/frostbitten-hair-webgpu).
