---
title: "Backpropagation notes"
excerpt: "Electronic version of notes that I took during super-resolution CNN project"
date: 2015-08-23 12:00:00
---

{% capture image_dir %}{{ site.url }}/images/draft{% endcapture %}


This is an electronic version of my notes created during [super-resolution using neural networks](https://github.com/Scthe/cnn-Super-Resolution) project (read more at: ["Neural networks: implementation tips"]({{ site.url }}/2015/08/23/neural-networks-implementation-tips.html)). I would be surprised if this document was useful for someone else. Anyway, feel free to read it. You don't even have to deal with my sloppy handwriting.

Also be warned that I'm not going to explain 'what' and 'how'. My only goal is to show why the equations have presented forms.




## Chain rule

> You may not want to skip this part. Whole article is just application of this rule and following graphic representation helps a lot.

![Chain rule]({{image_dir}}/chain-rule.png)
*Function*

We have $$y=f(x)$$. Let say we also have some $${dz \over dy}$$ (requirement: *z* is function of *y*) and we know the function *f*. We can calculate $${dz \over dx}$$ using following formula:

$${dz \over dx} = {dz \over dy} \cdot {dy \over dx}$$

Now look again at the picture above and locale each variable. What is $${dy \over dx}$$? It's just $$f'$$. Since we know *f* we should be able to provide $$f'$$. Now, having removed all math obstacles, let see how we can apply this to neural networks. First we are going to supply some nomenclature.





## Dictionary

![Full network example]({{image_dir}}/network.png)
*Example of neural network*

* *l* - layer index, especially *l=1* for input layer and *L* for last layer
* $$h_{W,b} (X)$$ - hypothesis produced by the network. We are going to assume that $$h_{W,b} (X) = y^{(L)}$$
* node/unit - single neuron (symbols: *X* for nodes in input layer, $$y^{(l)}$$ otherwise)
* $$s_{l}$$ - number of nodes on layer *l*
* $$f_a$$ - activation function
* $$x^{(l)}$$ - value of node on layer l **before** application of activation function (see image below)
* $$y^{(l)}$$ - value of node on layer l **after** application of activation function: $$y^l = f_a(x^l)$$ (see image below)
* $$W^{(l)}$$ - weights between nodes on layers *l* and *l+1*
* $$b^{(l)}$$ - biases added to $$W^l y^l$$ (see forward propagation)
* $$\eta$$ - hyperparameter - learning rate
* $$\delta^{(l)}_j$$ - error term of j-th node of l-th layer
* cost function *J* - how good the network's output maps to ground truth

![Relation between 2 nodes on successive layers]({{image_dir}}/forward-1.png)
*Relation between 2 nodes on successive layers*




## Forward propagation in fully connected neural networks

We are going to use the following formulas:

$$x^{(l+1)}_j = \sum_{i=1}^{s_{l}}(W^{(l)}_{ji} y^l_i) + b^l_j$$

$$ y^{(l+1)}_j = f_a(x^{(l+1)}_j)$$




## How *bad* is it?

During reinforced learning it's critical to be able to judge the results of algorithm. Let's say that we have a sample *(Y,X)*, where *Y* is ground truth and *X* is input for our neural network. If we do forward propagation sequentially across all layers with some weights and biases we will receive hypothesis: $$h_{W,b}(X)$$. We define **cost function** as (one-half) squared error:

\\[ J(W,b;Y,X) = \frac{1}{2} ( Y - h_{W,b}(X) )^2 \\]

In layman's terms we measure difference between what we expected and what the algorithm has given, we square it and take half. Taking half of the result will come handy when we will calculate the derivative. It is also popular to add weight decay term to this formula, but we will keep things simple.




## Training algorithm

> Indices on weights: $$W_{ji}$$ is weight associated with connection between i-th node on layer *l* and j-th node on layer *l+1*. It is popular notation in all neural networks documents.

Our goal is to minimize $$J(W,b)$$ and to do that we will use [gradient descent](https://en.wikipedia.org/wiki/Gradient_descent)(GD) algorithm. Requirements of GD: function F is both defined and differentiable at least in neighbourhood of some point *p*. If we have a gradient at *p* we know in which 'direction' we can move so that the function increases it's value. If we move in negative direction the opposite should be true: $$F(p) >= F(GD(p))$$. For this to work we write GD as:

\\[ p_{n+1} = p_n - \eta \nabla F(p_n) \\]

As You can see we subtract to move in direction that should give smaller $$F(p_{n+1})$$. The $$\eta$$ (greek letter eta) determines how fast we are getting closer to the local minimum. If $$\eta$$ is too big, we will constantly miss it, if it is too small we will have to repeat the process a lot. You may remember from the symbols table that $$\eta$$ represents hyperparameter called learning rate.

We will update parameters with every epoch according to the following formulas:

\\[ W^l_{ji} = W^l_{ji} - \eta {\partial \over \partial W^{(l)}_{ji}} J(W,b;Y,X) \\]

\\[ b^l_{i} = b^l_{i} - \eta {\partial \over \partial b^{(l)}_{i}} J(W,b;Y,X) \\]


It's nothing more then applied gradient descent algorithm. The thing is that we have to update value for **every** parameter, for **every** layer in our network. We already have $$W^{(l)}_{ji}$$ and $$b^{(l)}_{i}$$ (these are the current values), $$\eta$$ is either a constant or we have some separate algorithm to calculate it. How to find $${\partial \over \partial W^{(l)}_{ji}} J(W,b;Y,X)$$ and $${\partial \over \partial b^{(l)}_{i}} J(W,b;Y,X)$$? The solution is to use the backpropagation algorithm.





## Backpropagation algorithm



### Last layer deltas

For **each** node we can calculate how much *"responsible"* this node was for the error of our hypothesis. These are so called *"deltas"* / *"error terms"*. We will use $$\delta^{(l)}_j$$ to describe error term of j-th node of l-th layer. Let's think about deltas for **last** layer. If we are using squared error as the cost function we have:

$$ \delta^{(L)}_j
= \frac{\partial}{\partial x^{(L)}_j} J(W,b;Y,X) =\\
= \frac{\partial}{\partial x^{(L)}_j} \frac{1}{2} (Y - h_{W,b}(X))^2 =\\
= (h_{W,b}(X) - Y) \cdot {f_a}'(x^{(L)}_j) $$

Do You see how $$\frac{\partial}{\partial x^{(L)}_j} J(W,b;Y,X)$$ expresses *responsibility* of j-th node for the error? The $$f_a`(x^{(L)}_j)$$ term comes from the $$\frac{\partial}{\partial x^{(L)}_j} h_{W,b}(X)$$ that we have to include - it is one of the rules of calculating derivatives. We can use this formula to calculate deltas for all nodes in last layer.

> It is important to see that we are calculating derivative w.r.t. $$x^{(L)}_j$$, not $$y^{(L)}_j$$.




### Calculating remaining deltas

Sadly, calculations of deltas for other layers is a little bit more complicated. Let's look again on the image of forward propagation between 2 nodes on successive layers:

![Relation between 2 nodes on successive layers]({{image_dir}}/forward-1.png)
*Relation between 2 nodes on successive layers*

Let's assume that **l** is the layer before the last ($$l + 1 = L$$). We have just provided equations for $$\delta^{(L)}_j = \frac{\partial}{\partial x^{(L)}_j} J(W,b;Y,X)$$. After investigating the image above it turns out that we can use chain rule to provide formula for $$\delta^{(l)}_i$$. We are going to do this in several steps. First observation:

$$ \frac{\partial}{\partial y^{(l)}_i} J(W,b;Y,X) =\\
= \frac{\partial x^{(l+1)}_j}{\partial y^{(l)}_i}
  \frac{\partial}{\partial x^{(l+1)}_j} J(W,b;Y,X) =\\
= W^{(l)}_{ji} \cdot \delta^{(l+1)}_j $$

This is not entirely correct. During forward step our node $$x^{(l)}_i$$ contributes in some degree to values of **all** nodes in layer *l+1*. As a consequence, in backpropagation we have to sum over all nodes in *l+1*. If $$s_{l+1}$$ is number of nodes in l+1 then:

$$\frac{\partial}{\partial y^{(l)}_i} J(W,b;Y,X) =\\
  = \sum_{j=1}^{s_{l+1}} (
  W^{(l)}_{ji} \cdot \delta^{(l+1)}_j ) $$

![Full network example]({{image_dir}}/network.png)
*On previous image we focused only on 2 nodes. While it makes easier to derive formulas, we lose the general view. Do You see how every node contributes to values of all nodes on next layer?*

Remember when I said that in deltas we were calculating derivative w.r.t. $$x^{(L)}_j$$, not $$y^{(L)}_j$$? This applies here too. We have to use chain rule once more:

$$ \delta^{(l)}_i = \frac{\partial}{\partial x^{(l)}_i} J(W,b;Y,X) =\\
= \frac{\partial y^{(l)}_i}{\partial x^{(l)}_i}
  \frac{\partial}{\partial y^{(l)}_i} J(W,b;Y,X) =\\
= {f_a}'(x^{(l)}_i) \cdot \sum_{j=1}^{s_{l+1}} (
  W^{(l)}_{ji} \cdot \delta^{(l+1)}_j )$$

If $$y^{(l)}=f_a(x^{(l)})$$ then $$\frac{\partial y^{(l)}_i}{\partial x^{(l)}_i} = {f_a}'(x^{(l)}_i)$$. We can use this the equation to **calculate deltas for all nodes on other layers**.




### Derivative of J w.r.t to parameters

We have calculated deltas, now how does this help with parameters? Take a look once more on this image:

![Relation between 2 nodes on successive layers]({{image_dir}}/forward-1.png)
*Relation between 2 nodes on successive layers*

This should be simple:

$$ {\partial \over \partial W^{(l)}_{ji}} J(W,b;Y,X) =\\
= \frac{\partial x^{(l+1)}_j}{\partial W^{(l)}_{ji}}
  \frac{\partial}{\partial x^{(l+1)}_j} J(W,b;Y,X) =\\
  = y^{(l)}_i\cdot \delta^{(l+1)}_j $$

and

$$ {\partial \over \partial b^{(l)}_{j}} J(W,b;Y,X) =\\
= \frac{\partial x^{(l+1)}_j}{\partial b^{(l)}_{i}}
  \frac{\partial}{\partial x^{(l+1)}_j} J(W,b;Y,X) = \delta^{(l+1)}_j $$

All this because $$x^{(l+1)}_j = \sum_{i=1}^{s_{l}}(W^{(l)}_{ji} y^l_i) + b^l_j$$. I will leave calculating derivative of $$\sum_{i=1}^{s_{l}}(W^{(l)}_{ji} y^l_i) + b^l_j$$ w.r.t each $$W^{(l)}_{ji}$$ and $$b^l_j$$ to the reader.


> With deltas we had $$ \frac{\partial x^{(l+1)}_j}{\partial y^{(l)}_i} \cdot \delta^{(l+1)}_j $$ and now we have $$\frac{\partial x^{(l+1)}_j}{\partial W^{(l)}_{ji}} \cdot \delta^{(l+1)}_j $$. As You can see we use deltas in both of these expressions - that's why we have calculated them!





### Backpropagation in batch

Instead of updating parameters after each example it is more common to take average from the batch of *m* samples like this:

$$ \frac{\partial}{\partial W_{ji}^{(l)}} J(W,b) =\\
= \frac{1}{m} \sum_{k=1}^m \frac{\partial}{\partial W_{ji}^{(l)}} J(W,b; Y^{(k)}, X^{(k)}) $$

and

$$ \frac{\partial}{\partial b_{j}^{(l)}} J(W,b) =\\
= \frac{1}{m} \sum_{k=1}^m \frac{\partial}{\partial b_{j}^{(l)}} J(W,b; Y^{(k)}, X^{(k)}) $$




### TL;DR

1. Calculate deltas for each output unit (ones in last layer):

$$ \delta^{(L)}_j = (h_{W,b}(X) - Y) \cdot {f_a}'(x^{(L)}_j) $$

1. For each unit in other layers calculate deltas (do it layer by layer):

$$ \delta^{(l)}_i
= {f_a}'(x^{(l)}_i) \cdot \sum_{j=1}^{s_{l+1}} (
  W^{(l)}_{ji} \cdot \delta^{(l+1)}_j )$$

1. Calculate the derivatives for **all** weights and biases:

$$ {\partial \over \partial W^{(l)}_{ji}} J(W,b;Y,X) = y^{(l)}_i\cdot \delta^{(l+1)}_j $$

$$ {\partial \over \partial b^{(l)}_{j}} J(W,b;Y,X) = \delta^{(l+1)}_j $$


Now it's time for part II.





## Backpropagation in Convolutional Neural Networks (as it applies to images)

Main difference between fully connected and convolutional neural networks is that weights and biases are now reused. As this is not general neural networks tutorial I'm not going to explain this.

> TL;DR: You have a kernel (that actually consists of weights!) and You convolve it with pixels in top-left corner of image, then with pixels a little bit to the right (and so on), later repeat this in next row (and so on). Since we apply **same** kernel several times across the image, we effectively share kernel (therefore - weights).

![CNN - weights sharing]({{image_dir}}/cnn-all.gif)
*Weights sharing in CNN. For each node on next layer the kernel stays the same, but input units change*

Another thing we are not going to talk about is pooling.




### Dictionary - CNN

* $$w^{(l)}_{img}$$ and $$h^{(l)}_{img}$$ - size of first 2 dimensions of the layer.
* $$n^l$$ - feature maps/filters for layer *n*. Creates layer's third dimension - this means each layer has $$w^{(l)}_{img} \cdot h^{(l)}_{img} \cdot n^l$$ units.
* $$f^{(l)}$$ - spatial size of the kernel. Each kernel has dimensions $$f^{(l)} \cdot f^{(l)} \cdot n^{(l)}$$.

> $$f_a$$ is activation function, $$f^l$$ is size of kernel.




### Size of the layers

If You have worked with image kernels before You know that it is a problem to handle pixels that are near the edges. Common solutions are to pad the image with zeroes around the borders or make each consecutive layer smaller. In latter case, we can determine size of layer's first 2 dimensions with following formulas:

$$w^{(l+1)}_{img} = w^{(l)}_{img} - f^{(l)} + 1 \\
  h^{(l+1)}_{img} = h^{(l)}_{img} - f^{(l)} + 1$$

In case of 3 layers the output has following sizes when compared to the input:

$$w^{(L)}_{img} = w^{(1)}_{img} - f^{(1)} - f^{(2)} - f^{(3)} + 3 \\
  h^{(L)}_{img} = h^{(1)}_{img} - f^{(1)} - f^{(2)} - f^{(3)} + 3$$


Layer's third dimension is the number of feature maps ($$n^l$$) for this layer.




### Forward propagation

Based on reasons stated above:

$$ x^{(l+1)}_{i,j,n} =
\sum^{f^l}_a \sum^{f^l}_b \sum^{n^l}_k
  (W^{(l)}_{abnk} \cdot y^{(l)}_{(i+a),(j+b),k}) + b_{n}$$

$$ y^{(l+1)}_{i,j,n} = f_a(x^{(l+1)}_{i,j,n}) $$

Value ranges:

$$ i \in [0, w^{(l+1)}_{img} ), \\
   j \in [0, h^{(l+1)}_{img} ), \\
   n \in [0, n^{l+1} ) $$

> There are other ways to write this equations, but this one is IMO the simplest.




### Deltas

Formula for deltas on last layer **stays the same**. As for everything else..

During forward pass we had summations like: $$ \sum^{f^l}_a \sum^{f^l}_b \sum^{n^l}_k $$. As You may have guessed, during backpropagation we will have something similar:

$$ \delta^{(l)}_{i,j,k} = \\
 {f_a}'(x^{(l)}_{i,j,k}) \cdot \sum^{f^l}_a \sum^{f^l}_b \sum^{n^{l+1}}_n (
W^{(l)}_{abnk} \cdot \delta^{(l+1)}_{(i+a),(j+b),n})$$

Previously, when calculating $$\delta^{(l)}_i$$ we used:

1. derivative of this node's value: $${f_a}'(x^{(l)}_i)$$,
1. all weights connected to $$x^{(l)}_i$$: $$W^{(l)}_{ji}$$,
1. $$\delta^{(l+1)}_j$$ for node at the other end of this weight

Turns out the only changes are the sums and indexes. Before, we summed over **all** nodes in next layer (it was 'fully-connected layer' after all), now we only interact with handful of nodes. Let's write what is what:

* $${f_a}'(x^{(l)}_{i,j,k})$$ - derivative of activation function at current node
* $$W^{(l)}_{abnk}$$ - propagation weight between $$ y^{(l)}_{i,j,k}$$ and $$x^{(l+1)}_{(i+a),(j+b),n} $$
* $$\delta^{(l+1)}_{(i+a),(j+b),n} $$ - error term for $$x^{(l+1)}_{(i+a),(j+b),n} $$. Also, since $$w_{img}^{(l)} >= w_{img}^{(l+1)}$$ You have to do bounds check. For example, take nodes in bottom right corner of layer l: $$ y^{(l)}_{ w^{(l)}_{img}, h^{(l)}_{img}, -} $$. This particular node will be used during forward pass only **once** (per feature map in $$n^{l+1}$$).

> Sometimes it is written as $$\delta^{(l+1)}_{(i-a),(j-b),n}$$. I'm not sure, but this may be a matter of indices. The minus since we have $$node^{(l+1)}$$ and we asking: 'which $$node^{(l)}$$ affected us with w[a,b,-,-]?'.

Value ranges:

$$ i \in [0, w^{(l)}_{img} ), \\
   j \in [0, h^{(l)}_{img} ), \\
   k \in [0, n^{l} ) $$



### Parameters

The key now is to follow the sentence from TL;DR in [CNN - forward propagation](#forward-propagation):

> 'Since we apply **same** kernel several times across image, we effectively share kernel (therefore - weights).'

More specifically, we are sharing each weight $$w^{(l+1)}_{img} \cdot h^{(l+1)}_{img}$$ times. Now, during backpropagation we add all this contributions:

$$ {\partial \over \partial W^{(l)}_{abnk}} J(W,b;Y,X) = \\
 \sum^{w^{(l+1)}_{img}}_i \sum^{h^{(l+1)}_{img}}_j (
  y^{(l)}_{(i+a),(j+b),k} \cdot \delta^{(l+1)}_{i,j,n} )$$

and

$$ {\partial \over \partial b^{(l)}_{n}} J(W,b;Y,X) = \\
 \sum^{w^{(l+1)}_{img}}_i \sum^{h^{(l+1)}_{img}}_j (
  \delta^{(l+1)}_{i,j,n} )$$






## Summary

Hopefully notes presented here helped You understand neural networks better. If You know how the equations were created You can adapt them to any use case.
