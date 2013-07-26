#  Gradientmaps.js 

Javascript library that allows you to easily apply gradient maps to any element on the page.

## What is a Gradient Map you ask?
Traditionally, gradient maps are used in Photoshop.  Think about taking an image and converting it to grayscale.  Then, take a linear gradient and map that linear gradient to your image, where the left end of your gradient are the darkest values in your image, and the right end of your gradient maps to the brightest parts of your image.  If you have a simple linear gradient from red to blue, the darkest parts of your image will get mapped to red, the brightest parts will get mapped to blue, and everything else will be some combination of red and blue, depending on how light or dark it is.

## Usage

First, include the script in your page, most likely just before your closing &lt;body&gt; tag.

```
<script src='gradientmaps.min.js'></script>
```

Now, you can apply a gradient to any element on the page using the following Javascript:

```
GradientMaps.applyGradientMap(targetElement, linearGradient);
```


**linearGradient** uses the same format as [CSS linear gradients](http://docs.webplatform.org/wiki/css/functions/linear-gradient) without the initial angle, sides or corners.  Instead you provide simply a list of comma-separated color-stops.

Each color-stop consists of a color followed by an optional position.

The color can be in any of the standard CSS color formats (rgb, rgba, hsl, hsla, named color or #hex-color).

The position is either a percentage (e.g. 50%) or a fraction from 0.0 to 1.0.

If the initial color-stop has no position, it is assumed to be 0%
If the final color-stop has no position, it is assumed to be 100%
If a color stop has no position, and it is not the first or last color-stop, it is positioned half way between the previous and next color-stop.
If a color stop's position is less than the previous color-stop, it is repositioned to that of the previously positioned color-stop.

## Examples

```
<img src="myimage.png" id="myimage">
```

Convert to Black & White:
```
<script src="gradientmaps.min.js"></script>
<script>
var target = document.getElementById('myimage');
var gradientMap = "black, white";

GradientMaps.applyGradientMap(target, gradientMap);
</script>
```

Convert to Black & white, and darken the mid-tones a bit:
```
GradientMaps.applyGradientMap(target, "black, gray 60%, white");
```

Map to a range of colors:
```
GradientMaps.applyGradientMap(target, "red, #00FF00, rgb(0, 0, 255), yellow");
```

## Contributing

**DO NOT directly modify the `gradientmaps.js` or `gradientmaps.min.js` files in the project root.** These files are automatically built from components located under the `src/` directory.

The project uses [Grunt](http://gruntjs.com) to automate the build process.


Grunt depends on [Node.js](http://nodejs.org/) and [npm](https://npmjs.org/). 


**Install Grunt**
```
npm install -g grunt
```

Tell Grunt to watch for changes and automatically build `gradientmaps.js` and `gradientmaps.min.js`:
```
grunt watch
```

While `grunt watch` is running, every time you make changes to components under `src/` the main files, `cssregions.js` and `cssregions.min.js`, are built and written to the project root.

To do a one-time build run:
```
grunt build
```

## Testing

** Currently there are no tests **

I know, lame.

### Requirements


## License information

The code in this repository implies and respects different licenses. This is a quick overview. For details check each folder's corresponding LICENSE.md file.

- Adobe Apache 2 for Gradientmaps
- MIT for csscolorparser
- Public Domain for tests, demos and docs 
- Third party assets under their own licenses

See LICENSE.md for details.
