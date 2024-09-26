---
title: "Rendering in 3D Gaussian Splatting"
permalink: "/blog/gaussian-splatting/"
excerpt: "Math notes for 3D Gaussian Splatting renderer."
date: 2024-06-03 12:00:00
image: "./gaussian-article-main-img.jpg"
draft: false
---


This blogpost is a web version of my notes for my ["WebGPU 3D Gaussian Splatting"](https://github.com/Scthe/unity-hair) renderer. I've focused only on the forward path, especially what to do after we already have the covariance matrix. There are 2 main approaches here:

* Use the larger eigenvalue to find a square around the Gaussian's mean. Most often used with a tiled renderer.
* Use eigenvectors to find the axis of the ellipsis. Place vertices on these axes.

I've described the math for both approaches.

> These are my notes, the notation is going to be sketchy. Don't worry, my tiny handwriting would have been much worse to read! I don't work in this sector. It's been a while since I had to use LaTeX on this blog. If you get something out of this page, then it's a value added for you. If not, well, it's not my problem.

Our main sources will be:

* ["3D Gaussian Splatting for Real-Time Radiance Field Rendering"](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) by  Bernhard Kerbl, Georgios Kopanas, Thomas Leimkühler, and George Drettakis.
* ["EWA Volume Splatting"](https://www.cs.umd.edu/~zwicker/publications/EWAVolumeSplatting-VIS01.pdf) by Matthias Zwicker, Hanspeter Pfister, Jeroen van Baar, and Markus Gross.



## Goal

Each Gaussian's transform is described using position, rotation, and scale. When projected onto a screen, it will have the shape of an ellipsis. You might remember from the [principal component analysis](https://en.wikipedia.org/wiki/Principal_component_analysis) that the eigenvectors of the covariance matrix form the axis of this ellipsis. Our goal is to get the image space covariance matrix.


<Figure>
  <BlogImage
    src="./gaussian-scatterPCA.png"
    alt="Multivariate Gaussian distribution with its eigenvectors."
  />
  <Figcaption>

 Principal component analysis of a [multivariate Gaussian distribution](https://en.wikipedia.org/wiki/Multivariate_Gaussian_distribution "Multivariate Gaussian distribution"). The vectors shown are the [eigenvectors](https://en.wikipedia.org/wiki/Eigenvalues_and_eigenvectors "Eigenvalues and eigenvectors") of the [covariance matrix](https://en.wikipedia.org/wiki/Covariance_matrix "Covariance matrix").

  </Figcaption>
</Figure>



## Covariance 3D

Each Gaussian has a scale (vector $[sx, sy, sz]$) and rotation (quaternion with real part $q_r$ and imaginary parts $q_i, q_j, q_k$). We need transformation matrices for both.

Scale:

$$
S = \begin{bmatrix}
s_x & 0 & 0 \\
0 & s_y & 0 \\
0 & 0 & s_z
\end{bmatrix}
$$

[Rotation](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation#Quaternion-derived_rotation_matrix) (assuming unit quaternion):

$$
R = \begin{bmatrix}
1 - 2 (q_j^2 + q_k^2) &
2 (q_i q_j - q_k q_r) &
2 (q_i q_k + q_j q_r) \\
2 (q_i q_j + q_k q_r) &
1 - 2 (q_i^2 + q_k^2) &
2 (q_j q_k - q_i q_r) \\
2 (q_i q_k - q_j q_r) &
2 (q_j q_k + q_k q_r) &
1 - 2 (q_i^2 + q_j^2) \\
\end{bmatrix}
$$

From the definition of [covariance matrix](https://en.wikipedia.org/wiki/Covariance_matrix) you might notice that $XX^T$ is proportional to the sample covariance matrix of the dataset X. If the mean is 0, the sum becomes a dot product. Like matrix multiplication. How does covariance change if we have 2 transformation matrices? Let $O=RS$, the combined transformation. Then the covariance of this 3D Gaussian is $\Sigma=OO^T$. From [the properties of the transposition](https://en.wikipedia.org/wiki/Transpose), we know that $(AB)^T =  B^T A^T$. Then $\Sigma=RSS^TR^T$. The scale matrix is diagonal, so $S^T=S$. The transposition of the rotation matrix is equal to its inverse. This might come in handy during debugging. Be prepared for [left/right-handedness](https://en.wikipedia.org/wiki/Cartesian_coordinate_system#Orientation_and_handedness) issues.

> Covariance is the parameter of the Gaussian. It's better if you don't think of "calculating the covariance matrix given scale and rotation". Instead, the Gaussian is parametrized by the covariance. So it happens that $RSS^TR^T$ gives a covariance matrix. Not sure if this makes sense, but I found this to be clearer. Additionally, backpropagation is easier with rotation and scale instead of the raw matrix. Covariance matrices have to be symmetric and positive semi-definite.


<Figure>
  <BlogImage
    src="./gaussian-transposed-rotation.jpg"
    alt="Example model that looks incorrect."
  />
  <Figcaption>

Model rendered with the inverted rotation matrix.

  </Figcaption>
</Figure>


## Covariance 2D

In 3D graphics, to project a vertex into a clip space we multiply its position by view and projection matrices. Let $W$ denote our view matrix. For Gaussians we will use the following Jacobian instead of a projection matrix:

$$
t = p W
$$

$$
J = \begin{bmatrix}
focal_x / t.z & 0 & -(focal_x \cdot t.x) / (t.z \cdot t.z) & 0 \\
0 & focal_y / t.z & -(focal_y \cdot t.y) / (t.z \cdot t.z) & 0 \\
0 & 0 & 0 & 0 \\
0 & 0 & 0 & 0 \\
\end{bmatrix}
$$

* p - position of the Gaussian in world space.
* t - position of the  Gaussian in view space.

Check the explanation for the Jacobian in ["EWA Volume Splatting"](https://www.cs.umd.edu/~zwicker/publications/EWAVolumeSplatting-VIS01.pdf), section 4.4 "The Projective Transformation". From what I understand, the mapping to perspective space can introduce perspective distortion. Depending on where on screen the Gaussian is rendered, it would have different size? The paper mentions that this mapping is not affine. I.e. it does not preserve parallelism. Use ray space instead. Find more details in:

* "EWA Volume Splatting",
* ["\[Concept summary\] 3D Gaussian and 2D projection"](https://xoft-tistory-com.translate.goog/49?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en&_x_tr_pto=wapp) (Google translated from Korean),
* ["Fundamentals of Texture Mapping and Image Warping"](https://www.cs.cmu.edu/~ph/texfund/texfund.pdf) by Paul S. Heckbert (section 3.5.5).


<Figure>
  <BlogImage
    src="./gaussian-persp-instead-of-J.jpg"
    alt="Example model that looks incorrectly."
  />
  <Figcaption>

Rendered model with projection matrix used instead of Jacobian.

  </Figcaption>
</Figure>


The values for focal distance depend on the camera settings. Based on the perspective matrix values and geometric definition of tangent:

```js
const focalX = projectionMat[0] * viewport.width * 0.5;
const focalY = projectionMat[5] * viewport.height * 0.5;
```

The perspective matrix calculation only takes [half of the provided field of view](https://github.com/greggman/wgpu-matrix/blob/92195f1d5c3f1ac5e58d238b61730ea7b9a92c45/src/mat4-impl.ts#L761). Hence multiplication by 0.5. Depending on our coordinate system, you might have to transpose this matrix.


With this, we can calculate $\Sigma'$:

$$
\Sigma' = JW \Sigma W^T J^T
$$

This uses the same trick as we have used for $\Sigma$ calculations.

We are only interested in the 2D projection of the Gaussian (we discard depth). Get the 2D variance matrix from the $\Sigma'$ by removing the third, and fourth rows and columns:

$$
\Sigma' = \begin{bmatrix}
a & b & c & d \\
e & f & g & h \\
i & j & k & l \\
m & n & o & p
\end{bmatrix}
\Leftrightarrow
\begin{bmatrix}
a & b \\
e & f
\end{bmatrix}
= cov2d
$$

If the determinant of the cov2d is &le; 0 then the shape would be a parabola or a hyperbola instead of an ellipsis.

At this point, the reference implementation adds $0.3 \cdot I$ to the cov2d. It's done to ensure that the matrix is invertible. You can find the detailed explanation in AI葵's ["Gaussian Splatting Notes (WIP)"](https://github.com/kwea123/gaussian_splatting_notes).


## Calculating eigenvalues

> I recommend reading the [Eigenvalues_and_eigenvectors](https://en.wikipedia.org/wiki/Eigenvalues_and_eigenvectors#Matrix_examples) article on Wikipedia. The "Matrix examples" section has nice examples.

Let's calculate the eigenvalues. To make notation simpler, I've assigned a letter to each element of the 2D matrix cov2d.

$$
cov2d = \begin{bmatrix} a & b \\ b & c\end{bmatrix}
$$

$$
det(cov2d - \lambda I) = \begin{bmatrix} a-\lambda & b \\ b & c-\lambda\end{bmatrix}
=\lambda^2 - (a+c)\lambda + ac - b^2
$$

$det(cov2d - \lambda I) = 0$ when (calculating the [roots of the quadratic equation](https://www.wolframalpha.com/input?i=%CE%BB%5E2+-+%28a+%2B+c%29%CE%BB+%2B+ac+-+b%5E2%3D0)):

$$
\lambda_1 = 0.5 \cdot (a+c + \sqrt{a^2 - 2ac + 4b^2 + c^2})
$$

$$
\lambda_2 = 0.5 \cdot (a+c + \sqrt{a^2 - 2ac + 4b^2 + c^2})
$$


> Remember that ($a^2 - 2ac + 4b^2 + c^2) = (a-c)^2 + 4b^2$. Might make the implementation easier.

The $\lambda_1$ and $\lambda_2$ (the eigenvalues) are the radiuses of the projected ellipsis along major and minor axes. Since the value for the square root is always &gt;1 (at least in our case), then $\lambda_1$ > $\lambda_2$. You would expect this from the ellipsis projection.

Right now we have 2 options. We can either get the eigenvectors to derive vertex positions. This is not what the "3D Gaussian Splatting" paper did. They've collected all the Gaussians for each tile of their tiled renderer using conservative approximation. We will derive both solutions, starting with the one used in the paper.

  

## Method 1: Project Gaussian to a square


### Calculate tiles

The Gaussian distribution has a value even at infinity. This means that every Gaussian affects every pixel. Most of them with negligible results. We want to know which closest tiles it affects the most. Look at the 1D Gaussian distribution, and find radius "r" so that $[-r, r]$ contains most of the area. For normal distribution with $\mu=0, \sigma=1$:

  
$$
Error =
1 -
\int_{-r}^r \frac{e^{-x^2/2}} {\sqrt{2 \pi}}
$$



<Figure>
  <BlogImage
    src="./gaussian-standard-normal-distribution.png"
    alt="Normal distribution N(0, 1)."
  />
  <Figcaption>

Normal distribution with $\mu=0, \sigma=1$. Percentage numbers for relative area between each standard deviation.

  </Figcaption>
</Figure>


For example, if you picked $r=3$, then the [integral has a value](https://www.wolframalpha.com/input?i=integral+e%5E%7B-x*x%2F2%7D+%2F+sqrt%282+pi%29+from+-3+to+3) of ~0.9973. Such an approximation has an error of ~0.27%. As you might suspect, the variance will affect the calculations. We end up with $r = 3 \sqrt{\sigma}$. Sigma is a variance of the Gaussian. For us, it's $\lambda_1, \lambda_2$ (where $\lambda_1$ has a bigger value).

```rust
let radius = ceil(3.0 * sqrt(max(lambda1, lambda2)));
```

The `radius` is in pixels. We also have the Gaussian's position projected into an image space. Every tile inside the `radius` around the projected position is affected by the Gaussian. To map it to tiles, we calculate the affected square: `projectedPosition.xy +- radius.xy`.
  

```rust
let projPos = mvpMatrix * gaussianSplatPositions[idx];
// (we can also cull the Gaussian here if we want)
projPos /= projPos.w; // perspective divide
let projPosPx = ndc2px(projPos.xy, viewportSize);

// https://github.com/graphdeco-inria/diff-gaussian-rasterization/blob/59f5f77e3ddbac3ed9db93ec2cfe99ed6c5d121d/cuda_rasterizer/auxiliary.h#L46
let BLOCK_X = 16, BLOCK_Y = 16; // tile sizes
let blockSize = vec2<i32>(BLOCK_X, BLOCK_Y);
// block count for x,y axes
let grid = (viewportSize.xy + blockSize.xy - 1) / blockSize.xy;
let rectMin = vec2<i32>(
  min(grid.x, max(0, (int)((projPosPx.x - radius) / BLOCK_X))),
  min(grid.y, max(0, (int)((projPosPx.y - radius) / BLOCK_Y)))
);  
let rectMax = vec2<i32>(
  min(grid.x, max(0, (int)((projPosPx.x + radius + BLOCK_X - 1) / BLOCK_X))),
  min(grid.y, max(0, (int)((projPosPx.y + radius + BLOCK_Y - 1) / BLOCK_Y)))
);
```

With this, we know which tiles are affected by each Gaussian.



### Depth sorting

For each tile, we will need its Gaussians sorted by the distance to the camera (closest first). For sorting on the GPU, [Radix sort](https://en.wikipedia.org/wiki/Radix_sort) is popular, but [Bitonic sort](https://en.wikipedia.org/wiki/Bitonic_sorter) is much easier to implement. On the CPU, you can use your language's built-in [sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) for a terrible performance. Or [Counting sort](https://en.wikipedia.org/wiki/Counting_sort) for something 6+ times better (according to my app's profiler).



### Gaussian's value at pixel

You might know the general form of the [Gaussian distribution](https://en.wikipedia.org/wiki/Normal_distribution):

$$
f(x) =
\frac{1}{\sigma \sqrt{2\pi}}
~
exp({
  -\frac{1}{2}
  (\frac{x-\mu}{\sigma})^2
})
$$


["EWA Volume Splatting"](https://www.cs.umd.edu/~zwicker/publications/EWAVolumeSplatting-VIS01.pdf) provides a function (eq. 9) for the density of an elliptical Gaussian $G_V(x − p)$ centered at a point $p$ with a variance matrix $V$:

$$
G_V(x-p) =
\frac{1}{2\pi |V|^{\frac{1}{2}}}
~
exp(
  -\frac{1}{2}
  (x-p)^T
  V^{-1}(x-p)
)
$$

>The above formula [depends on the dimensionality](https://geostatisticslessons.com/lessons/errorellipses). Only the $(2\pi)^{-d/2}$ changes. Here, "d" denotes dimensionality (2 in our case).
  
In our case, V=cov2d matrix. We need its determinant ($|V|$) and [inverse](https://en.wikipedia.org/wiki/Invertible_matrix) $V^{-1}$:

$$
V^{-1} = adj(V) / |V|
$$

$$
adj(\begin{bmatrix} a & b \\ b & c\end{bmatrix}) =
\begin{bmatrix} c & -b \\ -b & a\end{bmatrix}
$$


> In "EWA Volume Splatting", the inverse of the variance matrix is called the conic matrix. You might have seen this word used as a variable name.


<Figure>
  <BlogImage
    src="./gaussian-mu-vs-p.png"
    alt="Projected Gaussian it's mean marked a vector from an example pixel center."
  />
  <Figcaption>

Projected 3D Gaussian. $\mu$ ("p" in "EWA Volume Splatting" notation) is the projected mean of the Gaussian. The "x" is the center of an example pixel.

  </Figcaption>
</Figure>


We will now look at ${  -\frac{1}{2}  (x-p)^T  V^{-1}(x-p)}$. Let's $(x-p) = \begin{bmatrix} x_0 & y_0 \end{bmatrix}$ and:

$$
V^{-1} = \begin{bmatrix}
a & b \\
b & c
\end{bmatrix}
$$

After matrix multiplication and a dot product:

$$
-\frac{1}{2}  (x-p)^T  V^{-1}(x-p)
\Leftrightarrow
-\frac{1}{2} (ax_0^2 + 2bx_0y_0 + cy_0^2)
$$

We can then calculate $exp(-\frac{1}{2} (ax_0^2 + 2bx_0y_0 + cy_0^2))$ as an exponential falloff from the mean point of the Gaussian at the pixel p. Multiply the result by the Gaussian's innate opacity (learned during the training). The $\frac{1}{2\pi |V|^{\frac{1}{2}}}$ was removed (?). Your trained model file will not display correctly if you add it back in.



### Blending
  
Rendering transparent objects is always done starting from the closest ones. Blend N Gaussians for a pixel using the following formula (eq. 3 from "3D Gaussian Splatting" paper):

$$
C = \sum_{i \in N} c_i \alpha_i \prod_{j=1}^{i-1}(1-a_j)
$$

* $c_i$ - RGB color of the i-th Gaussian.
* $\alpha_i$ - a combination of Gaussian's innate transparency at the current pixel wrt. its projected position and the opacity learned during the training.

This equation can be rephrased as:

1. The closest Gaussian writes its color $c_i$. Let's say that $\alpha_0 = 0.7$, then we write $result_0 = rgba(0.7 \cdot c_0, 0.7)$.
2. Next closest Gaussian (let's say $\alpha_1 = 0.9$) blends its color: $result_1 = rgba(result_0.rgb + 0.9c_1 \cdot (1 - result_0.a), 0.9 \cdot (1 - result_0.a))$.
3. Third closest Gaussian (let's say $\alpha_2 = 0.5$) blends its color: $result_2 = rgba(result_1.rgb + 0.5c_2 \cdot (1 - result_1.a), 0.5 \cdot (1 - result_1.a))$.

$$
result_{n+1}.rgb = result_n + c_{n+1} \cdot \alpha_{n+1} \cdot (1-result_n.a)
$$

$$
result_{n+1}.a = \alpha_{n+1} \cdot (1-result_n.a)
$$

Once the first Gaussian has written color with $\alpha_0 = 0.7$, the subsequent Gaussians can only affect the remaining 0.3 of the color. The 2nd Gaussian had $\alpha_1 = 0.9$. It writes its color with effective opacity $(1 - 0.7) * 0.9 = 0.27$. The 3rd Gaussian can only affect $(1 - 0.7) \cdot (1 - 0.9) = 0.3 \cdot 0.1 = 0.03$ of the output color. This repeats till we have gone through all Gaussians that touch this pixel. Writing to $result_i.a$ is a convenient way to carry over alpha calculations to the next Gaussians.

At some point, the impact of subsequent Gaussians will be negligible. From the paper:

> "When we reach a target saturation of 𝛼 in a pixel, the corresponding thread stops. At regular intervals, threads in a tile are queried and the processing of the entire tile terminates when all pixels have saturated (i.e., 𝛼 goes to 1). (...) During rasterization, the saturation of 𝛼 is the only stopping criterion. In contrast to previous work, we do not limit the number of blended primitives that receive gradient updates. We enforce this property to allow our approach to handle scenes with an arbitrary, varying depth complexity and accurately learn them, without having to resort to scene-specific hyperparameter tuning".



### Code

Below is the [corresponding code](https://github.com/graphdeco-inria/diff-gaussian-rasterization/blob/59f5f77e3ddbac3ed9db93ec2cfe99ed6c5d121d/cuda_rasterizer/forward.cu#L332) from the original repo. I've changed the formatting, and substituted comments to correlate the code with the equations above.

```c
float2 xy = collected_xy[j];
float2 d = { xy.x - pixf.x, xy.y - pixf.y }; // (x-p), in my equations it's [x_0, y_0]
// Values for conic. Assigning the values that I have used:
// a = con_o.x
// b = con_o.y
// c = con_o.z
float4 con_o = collected_conic_opacity[j];
float power = -0.5f * (con_o.x * d.x * d.x + con_o.z * d.y * d.y) - con_o.y * d.x * d.y;
if (power > 0.0f)
    continue;

// con_o.w is the Gaussians' alpha learned during the training.
// alpha is the opacity if there was no blending
float alpha = min(0.99f, con_o.w * exp(power));
if (alpha < 1.0f / 255.0f) // skip if alpha too small
    continue;

// Blending accumulation. T is from the previous iteration
float test_T = T * (1 - alpha);
if (test_T < 0.0001f) {
    done = true;
    continue;
}

// Eq. (3) from 3D Gaussian splatting paper.
for (int ch = 0; ch < CHANNELS; ch++) {
    // Gaussian's learned color * opacity
    C[ch] += features[collected_id[j] * CHANNELS + ch] * alpha * T;
}

T = test_T;// blending accumulation to reuse during next loop
```

We have now seen how to render the Gaussian by projecting it as a square. This technique is often used in tiled (compute shader-based) renderers. Or, we can use the eigenvectors to calculate vertex positions in the rendered pipeline.



## Method 2: Calculate eigenvectors


### Sorting and the index buffer

We will be blending the Gaussians into the framebuffer. Firstly, sort them based on the depth (closest to the camera first). A popular way is to use an index buffer. Render each Gaussian as a quad (2 triangles). With triangle list topology, each triangle has 3 indices. Total 6 indices (vertex shader invocations) per Gaussian. In the vertex shader, we need to know both the **splat index** and **which vertex of the splat** we are working with. Steps:


1. Sort the Gaussians and write the Gaussian's index into a u32\[] buffer of size `BYTES_U32 * splatCount`.
2. Create a buffer for "unrolled" indices of size `BYTES_U32 * splatCount * 6`.
3. Fill the "unrolled" based on the sorted Gaussians (see code below).
4. Read **splatIdx** and **vertexInSplatIdx** inside vertex shader:
    1. `@builtin(vertex_index) in_vertex_index: u32` or [gl_VertexID](https://registry.khronos.org/OpenGL-Refpages/gl4/html/gl_VertexID.xhtml) depending on the shading language.
    2. `let splatIdx = in_vertex_index / 6u;`
    3. `let vertexInSplatIdx = in_vertex_index % 6u;`

Code for "unrolling" the sorted `splatIds` to encode both `splatIdx` and `vertexInSplatIdx`:

```js
for (let i = 0; i < splatCount; i++) {
  const splatIdx = sortedSplatIndices[i];
  // write 6 consecutive values
  unrolledSplatIndices[i * 6 + 0] = splatIdx * 6 + 0;
  unrolledSplatIndices[i * 6 + 1] = splatIdx * 6 + 1;
  unrolledSplatIndices[i * 6 + 2] = splatIdx * 6 + 2;
  unrolledSplatIndices[i * 6 + 3] = splatIdx * 6 + 3;
  unrolledSplatIndices[i * 6 + 4] = splatIdx * 6 + 4;
  unrolledSplatIndices[i * 6 + 5] = splatIdx * 6 + 5;
}
```

Afterward, bind the index buffer and draw `splatCount * 6` vertices.



### Vertex shader - eigenvectors

We will continue from the point where we have calculated $\lambda_1$ and $\lambda_2$. Remember this image from the beginning of the article?

<Figure>
  <BlogImage
    src="./gaussian-scatterPCA.png"
    alt="Multivariate Gaussian distribution with its eigenvectors."
  />
  <Figcaption>

 Principal component analysis of a [multivariate Gaussian distribution](https://en.wikipedia.org/wiki/Multivariate_Gaussian_distribution "Multivariate Gaussian distribution"). The vectors shown are the [eigenvectors](https://en.wikipedia.org/wiki/Eigenvalues_and_eigenvectors "Eigenvalues and eigenvectors") of the [covariance matrix](https://en.wikipedia.org/wiki/Covariance_matrix "Covariance matrix").

  </Figcaption>
</Figure>


Continuing with the [eigenvalues and eigenvectors](https://en.wikipedia.org/wiki/Eigenvalues_and_eigenvectors#Matrix_examples) article, calculate the eigenvector for $\lambda_1$:

$$
\begin{bmatrix} a-\lambda_1 & b \\ b & c-\lambda_1\end{bmatrix}
\begin{bmatrix} v_1 \\ v_2 \end{bmatrix}
=
\begin{bmatrix} 0 \\ 0 \end{bmatrix}
$$

$$
\begin{cases}
v_1(a-\lambda_1)+v_2b = 0\\
v_1b + v_2(c-\lambda_1)=0
\end{cases}
$$

Expressing $v_2$ in terms of $v_1$, so we have $[v_1, v_2]^T$ that we can normalize:

$$
v_1(a-\lambda_1) + v_2b = v_1b + v_2(c-\lambda_1)
$$

$$
v_2b - v_2c + v2\lambda_1 = v_1b - v_1a + v_1\lambda_1
$$

$$
v_2(b-c+\lambda_1) = v_1(b-a+\lambda_1)
$$

$$
v_2 = v_1 (-a+b+\lambda_1) / (b-c+\lambda_1)
$$


The eigenvector:

$$
\begin{bmatrix}
v_1 \\
v1 (-a+b+\lambda_1) / (b-c+\lambda_1)
\end{bmatrix}
$$

We have the values for $a, b, c, \lambda_1$. We will treat this as a normalized vector - the directions of the ellipsis major/minor axis. In code, we can substitute any value for $v_1$, as we will normalize it anyway. You can also [solve](https://www.wolframalpha.com/input?i=v1*v1+%2B+%28v1+*+%28-a%2Bb%2B%CE%BB1%29+%2F+%28b-c%2B%CE%BB1%29%29%5E2+%3D+1%2C+for+v1):

$$
1 = \sqrt{
v_1^2 +
(
    v_1 (-a+b+\lambda_1) /
    (b-c+\lambda_1)
)^2
}
$$


```rust
let diagonalVector = normalize(vec2(1, (-a+b+lambda1) / (b-c+lambda1)));
let diagonalVectorOther = vec2(diagonalVector.y, -diagonalVector.x);
let majorAxis = 3.0 * sqrt(lambda1) * diagonalVector;
let minorAxis = 3.0 * sqrt(lambda2) * diagonalVectorOther;
```

  
cov2d is a symmetric matrix and $\lambda_1 \neq \lambda_2$, so the [eigenvectors are orthogonal](https://math.stackexchange.com/questions/142645/are-all-eigenvectors-of-any-matrix-always-orthogonal). We scale respective axis vectors by radii using (just as in the "tiled" renderer) $r = 3 \sqrt{\sigma}$. This works but may lead to problems at oblique angles. Most implementations clamp it to 1024.

> I've seen some implementations multiply ${\sigma}$ by $\sqrt{2}$ instead. Either I've missed something, or they (if I had to guess) forgot to divide $focal_x$ and $focal_y$ by 2.

The fixes result in the following implementation:
  
```rust
let majorAxis = min(3.0 * sqrt(lambda1), 1024) * diagonalVector;
let minorAxis = min(3.0 * sqrt(lambda2), 1024) * diagonalVectorOther;
// depends on which quad vertex you calculate
let quadOffset = vec2(-1., -1.);// or (-1., 1.), or (1., 1.), or (1., -1.)
projPos.xy += quadOffset.x * majorAxis / viewportSize.xy
            + quadOffset.y * minorAxis / viewportSize.xy;
result.position = vec4<f32>(projPos.xy, 0.0, 1.0);
result.quadOffset = quadOffset;
```



### Fragment shader

> Full fragment shader at the end of this section. Whole 6 LOC.
  
Let's imagine that our vertices produced a square. Then imagine our fragment shader draws a circle inside of this square (something like `length(uv.xy - 0.5) < 1`). This is **exactly** what we will do.  With 2 modifications:

* Smudge a circle so it does not have hard edges. Cause you know, it's Gaussian.
* Use Gaussian's color and opacity for blending.  


<Figure>
  <BlogImage
    src="./gaussian-uv-circle-to-ellipsis.png"
    alt="Circle gradient when vertices form a square and rhombus."
  />
  <Figcaption>

Circle gradient when vertices form a square and rhombus.

  </Figcaption>
</Figure>


To solve the first issue, we go back to ["EWA Volume Splatting"](https://www.cs.umd.edu/~zwicker/publications/EWAVolumeSplatting-VIS01.pdf), section 6 "Implementation":


<Figure>
  <BlogImage
    src="./gaussian-ewa_volume_splatting_except.png"
    alt="Fragment from 'EWA Volume Splatting' explaining e to the power of minus half radius."
  />
  <Figcaption>

Derivation of $e^{-\frac{1}{2}r}$. From "EWA Volume Splatting".

  </Figcaption>
</Figure>


The equation (9) is the one we have seen during tile renderer discussions:

$$
G_V(x-p) =
\frac{1}{2\pi |V|^{\frac{1}{2}}}
~
exp({
  -\frac{1}{2}
  (x-p)^T
  V^{-1}(x-p)
})
$$

I'm not sure about the derivation of $e^{-\frac{1}{2}r}$. It's the Gaussian's opacity based on the pixel's distance from the center. The Gaussian's color also includes transparency. This means color blending. That's the reason why we have sorted the Gaussians before the rendering.



### Blending settings

In graphic API we do not have access to colors written by previous invocations of the fragment shader. Instead, use the following blend functions:

```js
 color: {
  srcFactor: "one-minus-dst-alpha",
  dstFactor: "one",
  operation: "add",
},
alpha: {
  srcFactor: "one-minus-dst-alpha",
  dstFactor: "one",
  operation: "add",
},
```

They are equivalent to what we have discussed for the tiled renderer. Make sure that the `clearColor` for the framebuffer sets the alpha component to 0.



### Final fragment shader

The whole fragment shader in WGSL:

```rust
@fragment
fn fs_main(fragIn: VertexOutput) -> @location(0) vec4<f32> {
  let r = dot(fragIn.quadOffset, fragIn.quadOffset);
  if (r > 1.0){ discard; } // circle
 
  let splatOpacity = fragIn.splatColor.w;
  let Gv = exp(-0.5 * r);
  let a = Gv * splatOpacity;
  return vec4(a * fragIn.splatColor.rgb, a);
}
```

You might notice that both rendering methods calculated either $exp(-\frac{1}{2} (ax_0^2 + 2bx_0y_0 + cy_0^2))$ or $exp(-\frac{1}{2}r)$. In truth, both are exchangeable if you know how to derive them and adjust for vertex positions.



## References

* ["3D Gaussian Splatting for Real-Time Radiance Field Rendering"](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) by  Bernhard Kerbl, Georgios Kopanas, Thomas Leimkühler, and George Drettakis.
* ["EWA Volume Splatting"](https://www.cs.umd.edu/~zwicker/publications/EWAVolumeSplatting-VIS01.pdf) by Matthias Zwicker, Hanspeter Pfister, Jeroen van Baar, and Markus Gross.
* ["First time streaming in the U.S. (Talking about Gaussian Splatting cuda code)"](https://www.youtube.com/live/1buFrKUaqwM) by AI葵(AI Aoi). Has English subtitles.
* ["Combination of Multivariate Gaussian Distributions through Error Ellipses"](https://geostatisticslessons.com/lessons/errorellipses) by Clayton V. Deutsch and Oktay Erten.
* ["(Concept summary) 3D Gaussian and 2D projection"](https://xoft-tistory-com.translate.goog/49?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en&_x_tr_pto=wapp)  (Google translated from Korean).

