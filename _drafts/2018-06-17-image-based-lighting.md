---
title: "Image based lighting notes"
excerpt: "Image based lighting - equations + explanation"
date: 2018-06-17 12:00:00
tags: ['Rendering', 'PBR']
---

{% capture image_dir %}/assets/2018-06-17-image-based-lighting{% endcapture %}




{::comment}

TODO https://github.com/derkreature/IBLBaker for pseudo-algo
TODO brdf is always function of direction, this article provides args. randomly
TODO new syntax for images


mathjax:
  newline: \\
  https://docs.mathjax.org/en/latest/output.html?highlight=linebreak#automatic-line-breaking
{:/comment}



## Introduction

[Previously](/2018/06/04/pbr-notes), we have dealt only with point lights. The general algorithm was provided as follows:

$$
  L_0 (p,\omega_0) =
  \sum_{i=0}^{N-1} f_r(p, \omega_0, l_i) L(p, l_i) (n \cdot l_i)
$$

where
  * $$\omega_0$$ - direction towards the camera.
  * N - number of lights,
  * $$f_r$$ - BRDF function,
  * L - radiance from direction $$l_i$$,
  * n - surface normal,

{:/TODO above does not make sense from symbols standpoint}

It's nothing more then iterating over all lights, counting **radiance** from each one. In real world, the radiance does not come just directly from lights, as light bounces around from all objects. This makes object be *aware* of their environment and makes them *sit* better in their surrounding. The phenomenon is called global illumination. Overall, this equation can be generalized to:

$$
  L_0(p,\omega_0)
  = \int\limits_{\Omega}
      f_r(p, \omega_0, \omega_i) L_i(p, \omega_i) (n \cdot \omega_i) d\omega_i
$$

We switch from summation to integration - it can be intuitively thought as adding all light contribution over hemisphere around surface normal n. Sum of all radiance is called **irradiance**. Getting light from all around the scene may sound very computationally expensive - indeed it is! One of the problems is just storing such amount of data (unless we want to restart the computation every frame, at which point we are getting close to creating ray tracer engine). There are many solutions, including images and spherical harmonics. In this article we are going to explore using HDR images as a source of light in PBR pipeline.



## Using images to store light conditions

Storing image that describes lighting is not a new idea. Cubemaps were in OpenGL core since version 1.3. It was one of the techniques that Crytek used in Crysis 2 for global illumination and real-time reflection[5]. With the advent of PBR we yearn for more realism, to make rendering system as close as possible to what can be observed everyday. No wonder that once again we use same technique. It's based on a 4 key ideas:

> TODO mention google maps

1. An image can be wrapped completely (as a sphere) **around** the scene. Similar effect can be seen on following videos: [Fort Minor - Welcome](https://www.youtube.com/watch?v=REAwGmv0Fuk) (if You stop the video, You will have total control over the camera), [360° Video, Manhattan, New York, USA, 4K aerial video](https://www.youtube.com/watch?v=YM6GTu_RcWM). If you are unfamiliar with videos like this, just use Your mouse to look around the scene.
2. Every pixel of a image is a light source (or, in other words, every pixel of an image is a measurement of light incoming from that position).
3. The image which provides light is in HDR, since the nature does not have strict limit on number of bytes
4. We can have multiple such images for every virtual room and blend between results. Usually it is done by inserting many virtual probes for every $$m^2$$.


{::comment} TODO add sample cubemap {:/comment}


> We actually do not have to use cubemap to store light information about environment about us. There are many different formats, with different perspective projections.

After providing physically based BRDF from last article into previous equation, we receive:

$$
  L_0(p,\omega_0)
  = \int\limits_{\Omega}
    	(k_d\frac{c}{\pi}
        + k_s\frac{DFG}{4(v \cdot n)(\omega_i \cdot n)}
      )
    	L_i(p,\omega_i) (n \cdot \omega_i) d\omega_i
$$

Once again, we would have to calculate BRDF, but this time light does not come from single direction. Additional requirement is to make it run efficient enough for real-time usage. To do so, we will have to precompute several textures. But, let's not get ahead of ourselves and notice that we can split the integral around + sign resulting in separate integrals for diffusion and specular components:

$$ L_d(p,\omega_0)
	=	\int\limits_{\Omega}
        (k_d \frac {c}{\pi}) L_i(p,\omega_i) (n \cdot \omega_i)
    d\omega_i \\
  =  k_d \frac {c} {\pi}
    \int\limits_{\Omega}
      L_i(p, \omega_i) (n \cdot \omega_i)
    d\omega_i
$$

$$ L_s(p,\omega_0) =
		\int\limits_{\Omega}
      (k_s\frac{DFG}{4(\omega_0 \cdot n)(\omega_i \cdot n)})
			L_i(p,\omega_i) (m \cdot \omega_i)
    d\omega_i
$$




## Precalculation of diffuse irradiance

Turns out, for diffuse component, all we have to do is to precompute:

$$ \int\limits_{\Omega}
    L_i(p, \omega_i) (n \cdot \omega_i)
  d\omega_i
$$

{:/TODO left side?}

as the rest of the equation is constant and can be provided during runtime. We will store the result in separate cubemap. Since radiance for every direction l is known (just read it from the HDR image), all we need to do is sum it in hemisphere for each possible normal vector n (bascically calculate irradiance). Due to limitations of number of texels on the cubemap, there are not that many normals to calculate for. During precomputing step we run pixel shader for each texel of resulting cubemap, with leads to quite elegant implementation. Overall sampling procedure is based on [Monte Carlo simulation](https://en.wikipedia.org/wiki/Monte_Carlo_method).

{% highlight python linenos %}
  for texel in irradianceCubemap:
    # pixel shader shader executed for each texel
    normal = getNormalFromCubemapCoords(texel)
    irradiance = [0, 0, 0] # measure for 3 channels

    # Monte Carlo sampling
    for i in 0..numSamples:
      sampleVector = normal + getSampleOffset(i)
      irradiance += load(radianceCubemap, sampleVector) * dot(normal, sampleVector)

    # store result
    store(irradianceCubemap, texel, irradiance / numSamples)
{% endhighlight %}
<figcaption>
Generating irradiance map
</figcaption>

> You may have noticed that we are effectively running convolution. One of the most important decisions is implementation of getSampleOffset. It could range from random function, pseudorandom like Halton sequence or just iterating using constant deltas.

The result is then read during run time:

{% highlight python linenos %}
  diffuseColor = albedo / Math.PI * texture(irradiance, fragmentNormal)
{% endhighlight %}
<figcaption>
Reading precomputed irradiance for normal in pixel shader
</figcaption>

All that was possible because $$ k_d \frac {c} {\pi} $$ is a constant, not depending on position of the observer (which we does not know during precomputation).

<figure>
  <img src="{{image_dir}}/irradiance.jpg" alt=""/>
  <figcaption>
  Example radiance cubemap (left) and corresponding irradiance cubemap (right). Image from [learnopengl.com](https://learnopengl.com/PBR/IBL/Specular-IBL) under CC BY 4.0
  </figcaption>
</figure>

{::comment} TODO resize image {:/comment}




## Precalculation of specular component

Specular component was expressed using following equation:

$$ L_s(p,\omega_0)
  = \int\limits_{\Omega}
      f_{Cook-Torrance}(w_0, \omega_i)
      L_i(p,\omega_i)
      (n \cdot \omega_i)
    d\omega_i
\\
	= \int\limits_{\Omega}
      (k_s \frac
        {DFG}
        {4(\omega_0 \cdot n)(\omega_i \cdot n)}
      )
			L_i(p,\omega_i) (n \cdot \omega_i)
    d\omega_i
$$

We are also going to use Monte Carlo simulation, but this time with [importance sampling](https://en.wikipedia.org/wiki/Importance_sampling). Importance sampling is a technique used to decrease time that it takes for the results to converge and can be skipped if we always do the step offline. At the end of the article You can find [some additional explanation](#bonus-importance-sampling). Equations and selected $$p(l_k,v)$$ as presented in [2]:

$$
  L_s(v) =
    k_s \frac {1}{N}
    \sum_{k}^{N}
      \frac
        {f_{Cook-Torrance}(v, l_k) L(l_k) }
        { p(l_k,v) }
      (n \cdot l_k)
$$

$$
  p(l_k,v) = \frac {D(h)(n \cdot h)} {4(v \cdot h)}
$$

One thing that should be noted is that p does give more importance to vectors closer to the normal vector. Since the next steps can be complicated, I've allowed myself to copy them from [2]. You may notice slight difference in regards to the notation, but - for the most part - it should be easy to follow.


![Derivation of split-sum approximation, per [2]]({{image_dir}}/dice--split-sum-aprox.jpg){: standalone }


The only step that should require explanation is the last one. Firstly:

{::comment} TODO wtf? {:/comment}

> "One can notice an extra $$ n \cdot l$$ in the LD term as well as a different weighting $$\frac {1} {\sum_{i}^N} n \cdot l$. These empirical terms have been introduce by Karis to allows to improve the reconstructed lighting integral which suffers from coarse hypothesis of separability of this integral. There is no mathematical derivation for these terms, goal was to have an exact match with a constant L(l)."
*Quoted Karis's work refers to [1].*

Secondly, we may notice the usage of so called 'split sum approximation':

$$ \sum a_i b_i \approx \frac {1}{N} (\sum a_i) (\sum b_i) $$

when $$a_i, b_i$$ are uncorrelated ($$Cov[a,b]=0$$). Derived as such:

$$ \frac {1} {N} \sum a_i b_i
      \approx
   \frac {1}{N^2} (\sum a_i) (\sum b_i)
$$

$$ plim_{N \to \infty} \frac {1} {N} \sum a_i b_i
      \approx
   plim_{N \to \infty} \frac {1}{N^2} (\sum a_i) (\sum b_i)
$$

and due to law of large numbers:

$$ E[a_i b_i] = E[a_i] E[b_i]$$

See [3] for more details. Back to our $$ L_s(v)$$, we are going to tackle both expressions separately (and in result receive another 2 precomputed textures). But before that, let's make another approximation. When discussing difference between [diffuse and specular](# Framework for physically-plausible BRDF), we noted that diffuse component does not depend on viewing angle, while specular does. This makes calculation of $$L_i(l_k)$$ and F, G quite problematic. Indeed, [1] suggests just assuming v=n. This means that if we look at the surface lit by IBL, we would not get the strong reflection we would expect at grazing angles.


![Comparison of IBL specular approximation. Original source: [1], see for better resolution]({{image_dir}}/ue4 - aprox.jpg){: standalone }



## DFG term - environment BRDF

> TODO note only one per EVER, add all 'k' to notation, add f_0 to all F parameters

$$
  L_{s_{DFG}} =
    \frac {1} {N}
    \sum_k^N \frac
      {F(v,h,f_0) G(l,v,h)}
      {(n \cdot v) (n \cdot h)}
    (v \cdot h)
$$

One can note, that this equation expresses integration of specular BRDF with solid-white environment (as if $$ L_i({l_k}) = 1$$). After substituting equations from previous article, the exact value depends on:

* roughness
* **n** - normal vector (known, since this is what we calulate the value for)
* **v** - camera vector (known, since we already said we will aproximate and n=v)
* $$f_0$$ - used in Schlick’s approximation $$ F(f_0) = f_0 + (1 - f_0) (1 - (h \cdot v))^5 $$, is a 3 dimensional value
* **l** - direction of incoming light, though what we are really interested in is $$(l \cdot n)$$, which gives us range [0,1] for this parameter
* **h** - calculated based on onther parameters: $$h = \frac {l+v}{\|l+v\|}$$

We also may notice that:

$$ F(v,h,f_0)
  = f_0 + (1 - f_0) (1 - (h \cdot v))^5 \\
  = f_0 + (1 - (h \cdot v))^5 - f_0(1 - (h \cdot v))^5 \\
  = f_0 (1 - (1 - (h \cdot v))^5) + (1 - (h \cdot v))^5
$$

After splitting schlick's approximation into 2 parts we substitute it into $$ L_{s_{DFG}} $$ which in turns can be also split as follows:

$$
  L_{s_{DFG}} =
    f_0
    \frac {1} {N}
      \sum_k^N \frac
        {G(l,v,h)}
        {(n \cdot v) (n \cdot h)}
      (v \cdot h)
      (1 - (1 - (h \cdot v))^5) \\
    + \frac {1} {N}
      \sum_k^N \frac
        {G(l,v,h)}
        {(n \cdot v) (n \cdot h)}
      (v \cdot h)
      (1 - (h \cdot v))^5
$$

Having moved $$ f_0 $$ before sum sign, we notice that:

  * only 2 parameters needed are roughness and $$(l \cdot n)$$,
  * we simplified $$ L_{s_{DFG}} $$ to something resembling $$ L_{s_{DFG}} = f_0 * a + b $$, where a, b calculated from formula above

With 2 parameters (roughness, $$(l \cdot n)$$) and 2 outputs (a, b) we can create look-up texture (LUT). According to [2] precision can be a problem, and R16G16 is recommended.


<figure>
  <img src="{{image_dir}}/env_brdf_texture.png" alt=""/>
  <figcaption>
Red channel is value of a, green channel is value of b. $$ L_{s_{DFG}} = lut.r * f_0 + lut.g $$
  </figcaption>
</figure>


What's best, since we assumed $$ L_i({l_k}) = 1$$, this LUT **does not depend on the light nor the point**. In other words, You only need one in entire application.




## LD term - pre-filtered environment map

LD term described following formula:

$$
  L_{s_{LD}} =
    \frac {1}
          {\sum_{i}^{N} (n \cdot l)}
    \sum_{i}^{N} L(l)(n \cdot l)
$$

You may have noticed that if L describes incoming light, this equation is actually very similar to irradiance map that we calculated for diffuse, but it is now known as **pre-filtered environment map**. This time we take roughness into considerations: low roughness means sharp, detailed reflections, while high roughness means blurry reflections. As a result, we will create special cubemaps for each roughness (or as many as You would like). It's common to store them in mipmaps, where mipmaps of smaller size contain progressively more blurred values. Once again, we can use importance sampling wrt. GGX distribution to speed up the processing.

<figure>
  <img src="{{image_dir}}/ibl_prefilter_map.png" alt=""/>
  <figcaption>
  Example pre-filtered environment map. Image from [learnopengl.com](https://learnopengl.com/PBR/IBL/Specular-IBL) under CC BY 4.0
  </figcaption>
</figure>

You need to create separate pre-filtered environment map for each probe in the scene.



## Utilizing image based lighting in shader

> TODO write to put into ambient term per https://learnopengl.com/PBR/IBL/Diffuse-irradiance #PBR and indirect irradiance lighting

> TODO list all precomputed maps:
  * Pre-filtered environment map
  * environment BRDF

> TODO say that tools exists

{::comment}
//diffuse
indirectDiffuse = textureCube(IrradianceMap, refVec)  * diffuseColor

//specular
lod = getMipLevelFromRoughness(roughness)
prefilteredColor =  textureCube(PrefilteredEnvMap, refVec, lod)
envBRDF = texture2D(BRDFIntegrationMap,vec2(roughness, ndotv)).xy
indirectSpecular = prefilteredColor * (specularColor * envBRDF.x + envBRDF.y)

indirectLighting = indirectDiffuse + indirectSpecular
{:/comment}




> TODO add 'Working with HDR':
> 1. png will not cut it (with image)
> 1. explain RGBE
> 1. banding problems == convert rgbe=>float (with image)
> 1. remind to check cubemap rotation in GIMP 2.10



## Reference

[1] Real Shading in Unreal Engine 4
[2] https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
[3] https://math.stackexchange.com/questions/337643/split-up-sum-of-products-suma-i-b-i-approx1-n-suma-i-sumb-i-for-uncor
[4] https://learnopengl.com/PBR/IBL/Specular-IBL
[5] https://www.crytek.com/cryengine/presentations/lighting-in-crysis-2




## Bonus: importance sampling

Imagine we would want $$ \mu = E(f(X)) $$, but $$f(x) \approx 0$$ for every x outside region A. Sampling that function could be problematic if region A is very small ($$P(X \in A)$$ is small) as nearly every sample would return 0. Imagine doing survey among people who are taller then 2m: 'what is Your favorite colour?'. Asking the question is not a problem, but finding people tall enough is. You could stand on a busy street for a whole day and not meet a person matching this requirement. What would be a reasonable thing to do is to ask the players of local basketball team. This way You would switch the **nominal/target distribution** (all people) for **importance/proposal distribution** (basketball players). It has to be noted, that selecting importance distribution is not very strict process by itself, as volleyball players would do too. There are certain dangers in doing so: our chosen distribution could reflect nominal distribution *'badly'*, or we could end up with estimate that has infinite variance.

The other problem is to account for sampling from other distribution. To do this we have to analyze different formulas for expected value (provided for both discrete and continuous case).

$$ \mu = E(f(X))
  = f(x_1)p_1 + f(x_2)p_2 + ... + f(x_n)p_n
  = \sum_{i=1}^{N} f(x_i) p_i
$$

$$ \mu = E(f(X)) = \int\limits_{D} f(x)p(x) dx $$

> BTW. f is sometimes called integrand.

Now, introducing $$ X \sim q $$ (X has distribution of q):

$$ \mu
  = \int\limits_{D} f(x)p(x) dx
  = \int\limits_{D}
      \frac {f(x)p(x)} {q(x)}
      q(x)
    dx
  = E_q( \frac {f(x)p(x)} {q(x)} )
$$

If the last expression seem unfamiliar, remember that $$ E(f(X)) = \int\limits_{D} f(x)p(x) dx $$ and substitute $$ f(x) = \frac {f(x)p(x)} {q(x)} $$ into it. Our goal is still to find $$\mu$$. If we choose q in a way that both samples from interesting (for us) values and also simplifies calculation of $$ \frac {f(x)p(x)} {q(x)} $$ we could greatly speed up the whole process. $$\frac {p(x)} {q(x)}$$ is often called **likelihood ratio**. Estimator for $$\mu$$ is then calculated using following algorithm:

1. Generate samples $$x_1, x_2, ..., x_N$$ according to distribution q(x)
2. Use following formula:

$$ \mu_q =
      \frac {1} {N}
      \sum_{i=1}^{N} \frac {f(x_i)p(x_i)} {q(x_i)}
$$

There are, unsurprisingly, some constraints that I've skipped. If You are interested in this topic, I recommend to read:

* Art B. Owen, Monte Carlo theory, methods and examples [here](//statweb.stanford.edu/~owen/mc/) - probably the best explanation found
* Lecture notes from Eric C. Anderson [here](//ib.berkeley.edu/labs/slatkin/eriq/classes/guest_lect/mc_lecture_notes.pdf)
* Course notes from Tom Kennedy [here](//math.arizona.edu/~tgk/mc/notes.html) - see chapter 6
