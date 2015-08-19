---
title: "Neural nets: implementation tips"
excerpt: "Some tips helpful for those that implement neural networks from scratch"
date: 2015-08-12 12:00:00
---


> Plan
> 1. project
> 2. lessons:
>    * best thing ever
>    * separate params & metaparams
>    * ignore errors, make Your way around them
>    * scripts for everything
>    * tests
>    * backup
>    * amount of info in logs
>    * samples choosing
> 3. speed
>    * profile (link to commit)
>    * do not operate on single image - this is a special case
>    * remove blocks
>    * GPU architecture
>    * swap loop order
> 4. images
>    * [ ] Image comparing all upscale methods
>    * [ ] Present results
>    * [x] weights for layer 1
>    * [ ] example outputs after using each script
>    * [x] MNIST example
>    * [ ] small.jpg|old background|new result
>    * [ ] life is strange
>    * [ ] profiling: normal+kernel
>    * [ ] NVVP IMAGE
>   -> mnist_100_digits:
>      http://neuralnetworksanddeeplearning.com/index.html
>      https://github.com/mnielsen/neural-networks-and-deep-learning
>      MIT licence

> Other:
> * AWS



I'm not academic. Not everything in this article will be 100% scientifically correct. The target audience is hobbyists that want to understand (through implementation) neural networks. Maybe You’ve seen a cool app and want to create proof of concept of it’s core algorithm? Or maybe just want to see if a problem can be solved using machine learning? This article will help You in indirect way as I’m not going to explain what are neural networks. My goal is to provide You with some tips that IMO are valuable when attempting such project.




## Why not use [Caffe](http://caffe.berkeleyvision.org/)/[Torch7](http://torch.ch/)/[Theano](http://www.deeplearning.net/software/theano/)/... ?

Using neural network frameworks have numerous advantages: they can provide minimum viable product faster, offer shorter training time, are thoroughly tested, have good documentation and You can always ask for help/submit issue in case of problem. Why would one want to do it all by hand? Let’s see:

* complete understanding of underlying mechanism – even with solid theoretical understanding, there are always problems that manifest only in practice
* math – going from raw equations to working prototype is cool. How often does one have a chance to do that?
* better tuning options – since all frameworks use highly-tuned algorithms there is small chance the our solution will be faster, but we can always try
* interesting use case for  GPU
* it’s fun!




> ## Dictionary
>
> Some terms that I’m going to use throughout the article:
> training sample
> epoch
> kernel - both image & opencl




## My project

Throughout this post, I will be refering to my lastest project: **super-resolution using neural networks**.  Reposotorium is accesible [here](https://github.com/Scthe/cnn-Super-Resolution) and the original paper (Image Super-Resolution Using Deep Convolutional Networks) [here](http://arxiv.org/abs/1501.00092 "Orginal paper for my project").

[Super-resolution](https://en.wikipedia.org/wiki/Superresolution "Super-resolution definition") in itself is quite simple problem: make image bigger without losing much *quality*. It's a popular problem in computer vision, so there are quite a few methods to achieve this. I should point out that while there are infinitely many solutions, we -as humans- can instinctively determine if result is *better*. There are also special metrics f.e. [PSNR](https://en.wikipedia.org/wiki/Peak_signal-to-noise_ratio) and [SSIM](https://en.wikipedia.org/wiki/Structural_similarity) used for more engineerical aproach.

> IMAGE [Image comparing all upscale methods]
> IMAGE [Present results]

My implementation was a simplified version of SRCNN. While number of layers and kernel sizes are still the same, due too performance constraints I've reduced number of feature maps for layers 1 & 2 by half. I also didn't have enough time to wait for \\( 10^8 \\) epochs for network to converge. Nevertheless I'm quite happy with the results.







## General tips




### Best thing ever

Biggest problems that I've encountered:

* math
* hyperparameters tuning
* limited resources resulting in app crash
* training takes a lot of time
* optimal training samples
* parallel & asynchronous code execution on GPU
* GPU driver errors

Throughout the article I will give You some tips how to best approach all of them.




### Normal use case involves multiple images

During training You will operate on multiple samples, and -arguably- during normal usage this will also be the case. It is worth thinking how this aspect should be reflected in the design of application.


> REWRITE F.e. instead of allocating memory per image You allocate one big chunk and split it. This will make memory management more explicit and may also yield some performance gains. Huge disadvantage is that now You have to factor for multiple data aspect in every kernel - in practice this may be huge complication. It is worth thinking about it beforehand, since this decision affects all internal APIs.




### What to log

Everything that is needed to reproduce results. That includes hyperparameters, parameters, preprocessing & postprocessing methods, seeds, training/validation set split etc. Good idea is to use Git for settings/result storage  but I’ve found that file based management suits me better. With the amount of data are we dealing with it's not necessary  to log *everything*. For example why would You need detailed statistics about each epoch? Another case is when calculation of certain value shows up in profiling. The most important is reproducibility and crash log.

> Since the data is heavily restricted to set of training samples and we are crunching numbers with amazing speed the failures do not happen that often. On the other hand Nvidia's driver sometimes allow out of bounds access which manifests itself in very unexpected ways.



### Choosing training samples

If there is standard/already provided training set for Your domain use it. Good example is [MNIST](http://yann.lecun.com/exdb/mnist/) for handwritten numbers. Generating samples by hand is actually quite complicated. When I started I just took small patches from series of images and hoped the program would be able to infer some general rules that would magically make my program extremely universal and flexible. This was not a case. Fortunately, at least I was able to see that the network works, since feature maps for first layer had familiar shapes of gaussian/edge kernels. I’d switched to images based on comics/vector graphic and I’ve received something recognisable much faster. **As shown below it was important to select one particular style of images and stick with it.** Also important is the number of used samples. If You have 200 samples at Your disposal and dedicate 20% of them for validation set the spread will probably be too huge to derive any useful information. For comparison MNIST contains over 60,000 images while [ImageNet](http://www.image-net.org/) over 14,000,000.

> Add #samples for SRCNN
> fix sentence in bold

There is also excellent article written by Andrej Karpathy: [„What I learned from competing against a ConvNet on ImageNet”](http://karpathy.github.io/2014/09/02/what-i-learned-from-competing-against-a-convnet-on-imagenet/) that highlights some problems related to gathering samples (although article was written in slightly different context). One solution is to use services like [Amazon Mechanical Turk](https://www.mturk.com/mturk/welcome) that allows to commision tasks that require human input.

> IMAGE MNIST example
> IMAGE small.jpg|old background|new result
> IMAGE Life is strange




### Tests

Tests are necessary to check if math is implemented correctly, but is not only reason why You should write them. Beside usual suspects (ease of refactoring, better code design with isolated features, documentation through usage example etc.) it is important to test how the code reacts to amount of data we will use. For example each OpenCL kernel on Windows has to finish in about 2s. If it takes longer then that the OS will decide that GPU is unresponsive (["Display driver stopped responding and has recovered”](https://devtalk.nvidia.com/default/topic/459869/cuda-programming-and-performance/-quot-display-driver-stopped-responding-and-has-recovered-quot-wddm-timeout-detection-and-recovery-/)). It is a good idea to test for that. I’ve decided to have 2 separate test cases – one for correctness, one just uses a lot of data and checks if it crashes.

> It is possible to increase the timer on Windows (google ‘windows gpu watchdog change’). Linux also has similar limitation. Or just use 2 cards – one as system GPU, other for calculations.

It is also profitable to think how we would design testing framework. Of course we could use standard frameworks, but creating our own is quite simple and may suit our requirements better.

> Rewrite: We are essentially applying series of transformations. What we probably want is to test each transformation with different data (f.e. like mentioned above). We can make an additional step and make our tests data-driven. Lets take a look at [this file](https://raw.githubusercontent.com/Scthe/cnn-Super-Resolution/master/test/data/test_cases.json) that defines all test cases for forward propagation phase. By adding another entry I can easily create more tests, without even touching C++. Use scripts to generate test data f.e.:

{% highlight python linenos %}
def convolution(x, y, spatial_size, values):
  for dx in range(spatial_size):
    for dy in range(spatial_size):
      yield dy,dx,values[x+dx][y+dy]

def forward(input,weights,bias,spatial_size,width,height):
  output = []
  for y in range(height):
    for x in range(width):
      tmp = 0
      for (dx,dy,input_value) in convolution(x,y,spatial_size,input):
        tmp += input_value * weights[dx,dy]
      output[y][x] += activation_func(tmp + bias)
  return  output
{% endhighlight %}
*2D convolution. Feature maps left as an exercise for reader*

> this was supposed to be caption to code!

Since it is offline tool the performance does not matter. Both R and MATLAB have convolution build-in, but it may require a little bit of juggling to convert Your data to suitable format.




### Use scripts

C++ is quite low level language. It would be counterproductive to use it for everything, so I've using Python for some high-level operations like:

* managing backups
* scheduling
* high level debugging f.e. drawing feature maps
* generating reports
* creating test data
* creating training samples

> IMAGE of weights for layer 1

List of scripts that I've used (feel free to reuse them):
* [generate_training_samples.py](generate_training_samples.py) - generate ready to use training samples based on images from provided directory
* [weights_visualize.py](weights_visualize.py) - present weights as images
* [profile.py](profile.py) - measure execution time or time spend per OpenCL kernel
* [schedule_training.py](schedule_training.py) – user can specify number of epochs or how long we want for learning to continue

> Fix links

It's also worth mentioning that You can hardcode some values into scripts and then change the values without recompiling. If You are managing the configuration through separate folders it’s very easy to just copy the scripts and switch values.

> IMAGE example outputs after using each script




### Training scheduling [link to file](...)

> merge with previous paragraph

I highly recommend to write separate scheduling script. Some basic functionality should include f.e. ability to specify for how long to train (both by number of epochs and by duration), stop/resume, logs and backup management. This solution also allows You to hardcode some parameters and provide useful statistics. Logging itself can be implemented as redirecting from sysout to file (although this solution has a lot of disadvantages).

> Did You know that copying file in python is one-liner: ‘shutil.copy2(src_file_path, dest_file_path)’? There is no reason now to skip doing backup!




### Separate parameters from hyperparameters

While not critical, in my opinion this step is quite important. Every change to hyperparameters directly affects parameters that You will receive, so –including backup- You will probably have quite a lot of files. Efficiently managing data is a skill on it's own. This will come hand if You decide to create [separate schedule script](#use-scripts). Anyway, separation like this makes trivial to implement stop/resume functionality during training.

> Rewrite paragraph

Example hyperparameters:

* number of layers
* number of feature maps per layer
* size of kernels
* learning rates
* momentum
* weight decay
* distribution of initial values for parameters
* means of preprocessing the data

> already said that in 'logging'

Parameters on the other hand consists of weights and biases for each layer.




### Handling undetermined errors

What if the network crashes when we train for 1000 epochs? The error says ‘CL_OUT_OF_RESOURCES’, which actually means at least 3 different things. At this point we either start debugging **or** we just run 500 epochs twice.







## Optimization tips

In this part we will take a look on how to make neural networks faster. Some of the tips are going to be GPU/OpenCL specific. The easiest way to improve performance is to study existing implementations, but -personally- I’ve found them quite hard to read. This chapter will be just about my personal observations since I'm not GPU architecture expert.

Also [AWS](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using_cluster_computing.html) offers GPU instances that are quite popular.




#### Profile [link to commit](..)

One of the most important thing about profiling code is IMO to make it simple. If You have to configure and run some external program to profile code You may often decide it’s too much hassle. Sure, to closely investigate a bottleneck/memory access some additional information may be required, but a lot can be shown just from comparing 2 timer values. Writing separate profiling script makes it also easy to generate reports.

> ??? Informations You may be interested: execution time per epoch, time spend in each kernel and GPU usage.

> IMAGE screen from general profile




### Profiling OpenCL – simple way

The simplest way is to measure time spend per kernel. Fortunately OpenCL provides us with [clGetEventProfilingInfo](https://www.khronos.org/registry/cl/sdk/1.1/docs/man/xhtml/clGetEventProfilingInfo.html) that allows us to inspect time counters for following events: CL_PROFILING_COMMAND_QUEUED, CL_PROFILING_COMMAND_SUBMIT, CL_PROFILING_COMMAND_START, CL_PROFILING_COMMAND_END. Call [clGetDeviceInfo](https://www.khronos.org/registry/cl/sdk/1.1/docs/man/xhtml/clGetDeviceInfo.html) with CL_DEVICE_PROFILING_TIMER_RESOLUTION to get timer resolution.


Code sample (warning – it slows down app execution a lot):

{% highlight c linenos %}
cl_event kernel_ev;
clEnqueueNDRangeKernel(..., &kernel_ev); // call kernel

if (is_profiling()) {
  clWaitForEvents(1, &kernel_ev);
  cl_ulong start = 0, end = 0;
  clGetEventProfilingInfo(kernel_ev, CL_PROFILING_COMMAND_START, sizeof(cl_ulong), &start, NULL);
  clGetEventProfilingInfo(kernel_ev, CL_PROFILING_COMMAND_END, sizeof(cl_ulong), &end, NULL);
  execution_time[kernel_id] += end - start;
}
{% endhighlight %}




**For clGetEventProfilingInfo to work You have to set CL_QUEUE_PROFILING_ENABLE flag during clCreateCommandQueue.**

> IMAGE screen from kernel profile




### Profiling OpenCL – [Nvidia Visual Profiler](https://developer.nvidia.com/nvidia-visual-profiler "Nvidia Visual Profiler")

James Price has written excellent article on [getting nvvp to display OpenCL profile data](http://uob-hpc.github.io/2015/05/27/nvvp-import-opencl/). All that is needed is to set COMPUTE_PROFILE environment variable. You can also provide config file.

{% highlight c %}
> set COMPUTE_PROFILE=1
> set COMPUTE_PROFILE_CONFIG=nvvp.cfg
> cat nvvp.cfg
  profilelogformat CSV
  streamid
  gpustarttimestamp
  gpuendtimestamp
  gridsize
  threadblocksize
  dynsmemperblock
  stasmemperblock
  regperthread
  memtransfersize
> bin\cnn.exe train dry -c data\config.json --epochs 2 -i data\train_samples36
{% endhighlight %}

NVVP logs **every single** kernel invocation, so try to provide representative, yet short name for every kernel function.

Available information includes f.e.:

* number or registers used per kernel
* occupancy
* memory bandwidth between host and GPU
* block sizes
* detailed timeline that marks start and end of every kernel

> IMAGE - NVVP

Use [CodeXL](http://developer.amd.com/tools-and-sdks/opencl-zone/codexl/) for AMD devices.




### Remove blocking operations

The biggest change in performance in my case was due too removal of blocking operations like:

* clFinish
* clWaitForEvents
* clEnqueueReadBuffer
* clEnqueueReadBufferRect
* clEnqueueReadImage
* clEnqueueWriteBuffer
* clEnqueueWriteBufferRect
* clEnqueueWriteImage
* clEnqueueMapBuffer
* clEnqueueMapImage

Read, write and map operations should be used in non-blocking mode. Still, data transfer from host to GPU may be quite expensive.  I was lucky to have all my data fit into the memory at once. If this is not possible, try to minimize the amount of data that is exchanged. You can pack the data more effectively, but this is fairly low-level change.

> REWRITE Instead of every sample having it’s own memory use pooling. Also more general strategy would be to split each batch.

> more on batch/single aspect, but not here



### Hardcode constants

And by hardcode I mean [provide them at compile time](https://www.khronos.org/registry/cl/sdk/1.1/docs/man/xhtml/clBuildProgram.html) as macros. This allows for:

* arrays in kernels
* better compiler optimizations
* will make Your code faster - You will be f.e. doing comparisons with constants

{% highlight c linenos %}
clBuildProgram(__cl_program, 1, __device_id, "-D NUM_1=5 -D NUM_2=6", nullptr, nullptr);
{% endhighlight %}
*Compile with macros*

{% highlight c linenos %}
__kernel void main(...){
  float arr[NUM_1]; // this is legal
  if(NUM_1 > NUM_2) // essentially: 5 > 6
  ...
}
{% endhighlight %}
*Example kernel that uses provided macros*




### Swap loop order

Memory access works in a different way on GPU then on CPU. That means that some preconceptions should be checked again. Some of the materials that I've found useful:

* AMD Accelerated Parallel Processing OpenCL Programming Guide (also other materials on [AMD APP SDK info page](http://developer.amd.com/tools-and-sdks/opencl-zone/amd-accelerated-parallel-processing-app-sdk/) )
* OpenCL Programming Guide for the CUDA Architecture
* Paulius Micikevicius - Analysis-Driven Optimization and also Fundamental Optimizations
* Mark Harris - Optimizing Parallel Reduction in CUDA
* http://stackoverflow.com/questions/3843032/why-arent-there-bank-conflicts-in-global-memory-for-cuda-opencl
* http://uob-hpc.github.io/2015/05/27/nvvp-import-opencl/

Of course the road from theory to application is quite long.

> TODO check & add more



### Optimize for case

Sometimes You can create more efficient kernel when working under some assumptions. F.e. during training the images have all predefined size like 32x32, 64x64, 256x256. Maybe they fit in the local memory so that we can limit trips to VRAM? Or maybe we can optimize (even unroll) some loops when spatial size of this layer's kernel is 1? Or work group size can be changed to make memory reads in more efficient way? It is good to experiment, especially since GPU is quite exotic for most programmers.

