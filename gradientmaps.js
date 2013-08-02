/*
Copyright 2013 Adobe Systems Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/

/*
Gradient Maps support
Author: Alan Greenblatt (blatt@adobe.com, @agreenblatt, blattchat.com)
*/

window.GradientMaps = function(scope) {
    function GradientMaps() {
        this.init();
    }
    
    GradientMaps.prototype = {
        init: function() {
        },

        calcStopsArray: function(stopsDecl) {    
            /*
             * Each stop consists of a color and an optional percentage or length
             * stops: <color-stop> [, <color-stop>]
             * <color-stop>: color [ <percentage> | <length> ]?
             *
             * If the first color-stop does not have a length or percentage, it defaults to 0%
             * If the last color-stop does not have a length or percentage, it defaults to 100%
             * If a color-stop, other than the first or last, does not have a length or percentage, it is assigned the position half way between the previous and the next stop.
             * If a color-stop, other than the first or last, has a specified position less than the previous stop, its position is changed to be equal to the largest specified position of any prior color-stop.
             */
        
            var matches = stopsDecl.match(/(((rgb|hsl)a?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}(?:,\s*0?\.?\d+)?\)|\w+|#[0-9a-fA-F]{1,6})(\s+(0?\.\d+|\d{1,3}%))?)/g);
        
            var stopsDeclArr = stopsDecl.split(',');
            var stops = [];
        
            matches.forEach(function(colorStop) {
                var colorStopMatches = colorStop.match(/(?:((rgb|hsl)a?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}(?:,\s*0?\.?\d+)?\)|\w+|#[0-9a-fA-F]{1,6})(\s+(?:0?\.\d+|\d{1,3}%))?)/);
                if (colorStopMatches && colorStopMatches.length >= 4) {
                    posMatch = colorStopMatches[3];
                    stops.push({
                        color: parseCSSColor(colorStopMatches[1]),
                        pos: posMatch ? parse_css_float(posMatch) * 100 : null
                    })
                }
            });
        
            /*
             * Need to calculate the positions where they aren't specified.
             * In the case of the first and last stop, we may even have to add a new stop.
             * 
             * Go through the array of stops, finding ones where the position is not specified.
             * Then, find the next specified position or terminate on the last stop.
             * Finally, evenly distribute the unspecified positions, with the first stop at 0 
             * and the last stop at 100.
             */
        
            if (stops.length >= 1) {
                // If the first stop's position is not specified, set it to 0.
                var stop = stops[0];
                if (!stop.pos)
                    stop.pos = 0;
                else
                    stop.pos = Math.min(100, Math.max(0, stop.pos));
        
                var currentPos = stop.pos;
        
                // If the last stop's position is not specified, set it to 100.
                stop = stops[stops.length-1];
                if (!stop.pos)
                    stop.pos = 100;
                else
                    stop.pos = Math.min(100, Math.max(0, stop.pos));
        
                // Make sure that all positions are in ascending order
                for (var i = 1; i < stops.length-1; i++) {
                    stop = stops[i];
                    if (stop.pos && stop.pos < currentPos)
                        stop.pos = currentPos;
                    if (stop.pos > 100) stop.pos = 100;
                    currentPos = stop.pos;
                }
        
                // Find any runs of unpositioned stops and calculate them
                var i = 1;
                while (i < (stops.length-1)) {
                    if (!stops[i].pos) {
                        // Find the next positioned stop.  You'll always have at least the
                        // last stop at 100.
                        for (var j = i+1; j < stops.length; j++) {
                            if (stops[j].pos)
                                break;
                        }
        
                        var startPos = stops[i-1].pos;
                        var endPos = stops[j].pos;
                        var nStops = j - 1 + 1;
        
                        var delta = Math.round((endPos - startPos) / nStops);
                        while (i < j) {
                            stops[i].pos = stops[i-1].pos + delta;
                            i++;
                        }
                    }
        
                    i++;
                }
        
                if (stops[0].pos != 0) {
                    stops.unshift({
                        color: stops[0].color,
                        pos: 0
                    });
                }
        
                if (stops[stops.length-1].pos != 100) {
                    stops.push({
                        color: stops[stops.length-1].color,
                        pos: 100
                    })
                }
            }
        
            return stops;
        },

        findMatchingDistributedNSegs: function(stops) {
            var maxNumSegs = 100;
            var matched = false;
            for (var nSegs = 1; !matched && nSegs <= maxNumSegs; nSegs++) {
                var segSize = maxNumSegs / nSegs;
                matched = true;
                for (var i = 1; i < stops.length-1; i++) {
                    var pos = stops[i].pos;
                    if (pos < segSize) {
                        matched = false;
                        break;
                    }
                    var rem = pos % segSize;
                    var maxDiff = 1.0;
                    if (!(rem < maxDiff || (segSize - rem) < maxDiff)) {
                        matched = false;
                        break;
                    }
                }
        
                if (matched)
                    return nSegs;
            }       
        
            return nSegs; 
        },

        calcDistributedColors: function(stops, nSegs) {
            var colors = [stops[0].color];
        
            var segSize = 100 / nSegs;
            for (var i = 1; i < stops.length-1; i++) {
                var stop = stops[i];
                var n = Math.round(stop.pos / segSize);
                colors[n] = stop.color;
            }
            
            colors[nSegs] = stops[stops.length-1].color;
        
            var i = 1;
            while (i < colors.length) {
                if (!colors[i]) {
                    for (var j = i+1; j < colors.length; j++) {
                        if (colors[j])
                            break;
                    }
        
                    // Need to evenly distribute colors stops from svgStop[i-1] to svgStop[j]
        
                    var startColor = colors[i-1];
                    var r = startColor[0];
                    var g = startColor[1];
                    var b = startColor[2];
                    var a = startColor[3];
        
                    var endColor = colors[j];
        
                    var nSegs = j - i + 1;
                    var dr = (endColor[0] - r) / nSegs;
                    var dg = (endColor[1] - g) / nSegs;
                    var db = (endColor[2] - b) / nSegs;
                    var da = (endColor[3] - a) / nSegs;
        
                    while (i < j) {
                        r += dr;
                        g += dg;
                        b += db;
                        a += da;
                        colors[i] = [r, g, b, a];
                        i++;
                    }
                }
                i++;
            }
        
            return colors;
        },
        
        addElement: function(doc, parent, tagname, ns, attributes) {
            var elem = ns ? doc.createElementNS(ns, tagname) : doc.createElement(tagname);
            if (attributes) {
                Object.keys(attributes).forEach(function(key, index, keys) {
                    elem.setAttribute(key, attributes[key]);
                });
                    //elem.setAttribute(attr.name, attr.value);
            }
        
            if (parent) parent.appendChild(elem);
            return elem;
        },

        addSVGComponentTransferFilter: function(elem, colors) {
            var filter = null;
            var svg = null;
            var svgns = 'http://www.w3.org/2000/svg';
            var filterID = elem.getAttribute('data-gradientmap-filter');
        
            var svgIsNew = false;
        
            var doc = elem.ownerDocument;
            
            if (filterID) {
                filter = doc.getElementById(filterID);
                if (filter) {
                    // Remove old component transfer function
                    var componentTransfers = filter.getElementsByTagNameNS(svgns, 'feComponentTransfer');
                    if (componentTransfers) {
                        for (var i = componentTransfers.length-1; i >= 0; --i)
                            filter.removeChild(componentTransfers[i]);
        
                       svg = filter.parentElement;
                    }
                }
            }
        
            // The last thing to be set previously is 'svg'.  If that is still null, that will handle any errors
            if (!svg) {
                var svg = this.addElement(doc, null, 'svg', svgns, {
                    'version': '1.1',
                    'width': 0,
                    'height': 0
                });
        
                filterID = 'filter-' + (new Date().getTime());
                filter = this.addElement(doc, svg, 'filter', svgns, {'id': filterID});
                elem.setAttribute('data-gradientmap-filter', filterID);
        
                // First, apply a color matrix to turn the source into a grayscale
                var colorMatrix = this.addElement(doc, filter, 'feColorMatrix', svgns, {
                    'type': 'matrix',
                    'values': '0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0',
                    'result': 'gray'
                });
        
                svgIsNew = true;
            }
        
            // Now apply a component transfer to remap the colors
            var componentTransfer = this.addElement(doc, filter, 'feComponentTransfer', svgns, {'color-interpolation-filters': 'sRGB'});
        
            var redTableValues = "";
            var greenTableValues = "";
            var blueTableValues = "";
            var alphaTableValues = "";
        
            colors.forEach(function(color, index, colors) {
                redTableValues += (color[0] / 255.0 + " ");
                greenTableValues += (color[1] / 255.0 + " ");
                blueTableValues += (color[2] / 255.0 + " ");
                alphaTableValues += (color[3] + " ");
            });
        
            this.addElement(doc, componentTransfer, 'feFuncR', svgns, {'type': 'table', 'tableValues': redTableValues.trim()});
            this.addElement(doc, componentTransfer, 'feFuncG', svgns, {'type': 'table', 'tableValues': greenTableValues.trim()});
            this.addElement(doc, componentTransfer, 'feFuncB', svgns, {'type': 'table', 'tableValues': blueTableValues.trim()});
            this.addElement(doc, componentTransfer, 'feFuncA', svgns, {'type': 'table', 'tableValues': alphaTableValues.trim()});
        
            if (svgIsNew)
                elem.parentElement.insertBefore(svg, elem);
        
            var filterDecl = 'url(#' + filterID + ')';
            elem.style['-webkit-filter'] = filterDecl;
            elem.style['filter'] = filterDecl;
        
            //elem.setAttribute('style', '-webkit-filter: url(#' + filterID + '); filter: url(#' + filterID + ')');
        },

        applyGradientMap: function(elem, gradient) {
            var stops = this.calcStopsArray(gradient);
            var nSegs = this.findMatchingDistributedNSegs(stops);
            var colors = this.calcDistributedColors(stops, nSegs);
        
            this.addSVGComponentTransferFilter(elem, colors);
        },  
    }
    
    return new GradientMaps();
}(window);

// (c) Dean McNamee <dean@gmail.com>, 2012.
//
// https://github.com/deanm/css-color-parser-js
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

// http://www.w3.org/TR/css3-color/
var kCSSColorTable = {
  "transparent": [0,0,0,0], "aliceblue": [240,248,255,1],
  "antiquewhite": [250,235,215,1], "aqua": [0,255,255,1],
  "aquamarine": [127,255,212,1], "azure": [240,255,255,1],
  "beige": [245,245,220,1], "bisque": [255,228,196,1],
  "black": [0,0,0,1], "blanchedalmond": [255,235,205,1],
  "blue": [0,0,255,1], "blueviolet": [138,43,226,1],
  "brown": [165,42,42,1], "burlywood": [222,184,135,1],
  "cadetblue": [95,158,160,1], "chartreuse": [127,255,0,1],
  "chocolate": [210,105,30,1], "coral": [255,127,80,1],
  "cornflowerblue": [100,149,237,1], "cornsilk": [255,248,220,1],
  "crimson": [220,20,60,1], "cyan": [0,255,255,1],
  "darkblue": [0,0,139,1], "darkcyan": [0,139,139,1],
  "darkgoldenrod": [184,134,11,1], "darkgray": [169,169,169,1],
  "darkgreen": [0,100,0,1], "darkgrey": [169,169,169,1],
  "darkkhaki": [189,183,107,1], "darkmagenta": [139,0,139,1],
  "darkolivegreen": [85,107,47,1], "darkorange": [255,140,0,1],
  "darkorchid": [153,50,204,1], "darkred": [139,0,0,1],
  "darksalmon": [233,150,122,1], "darkseagreen": [143,188,143,1],
  "darkslateblue": [72,61,139,1], "darkslategray": [47,79,79,1],
  "darkslategrey": [47,79,79,1], "darkturquoise": [0,206,209,1],
  "darkviolet": [148,0,211,1], "deeppink": [255,20,147,1],
  "deepskyblue": [0,191,255,1], "dimgray": [105,105,105,1],
  "dimgrey": [105,105,105,1], "dodgerblue": [30,144,255,1],
  "firebrick": [178,34,34,1], "floralwhite": [255,250,240,1],
  "forestgreen": [34,139,34,1], "fuchsia": [255,0,255,1],
  "gainsboro": [220,220,220,1], "ghostwhite": [248,248,255,1],
  "gold": [255,215,0,1], "goldenrod": [218,165,32,1],
  "gray": [128,128,128,1], "green": [0,128,0,1],
  "greenyellow": [173,255,47,1], "grey": [128,128,128,1],
  "honeydew": [240,255,240,1], "hotpink": [255,105,180,1],
  "indianred": [205,92,92,1], "indigo": [75,0,130,1],
  "ivory": [255,255,240,1], "khaki": [240,230,140,1],
  "lavender": [230,230,250,1], "lavenderblush": [255,240,245,1],
  "lawngreen": [124,252,0,1], "lemonchiffon": [255,250,205,1],
  "lightblue": [173,216,230,1], "lightcoral": [240,128,128,1],
  "lightcyan": [224,255,255,1], "lightgoldenrodyellow": [250,250,210,1],
  "lightgray": [211,211,211,1], "lightgreen": [144,238,144,1],
  "lightgrey": [211,211,211,1], "lightpink": [255,182,193,1],
  "lightsalmon": [255,160,122,1], "lightseagreen": [32,178,170,1],
  "lightskyblue": [135,206,250,1], "lightslategray": [119,136,153,1],
  "lightslategrey": [119,136,153,1], "lightsteelblue": [176,196,222,1],
  "lightyellow": [255,255,224,1], "lime": [0,255,0,1],
  "limegreen": [50,205,50,1], "linen": [250,240,230,1],
  "magenta": [255,0,255,1], "maroon": [128,0,0,1],
  "mediumaquamarine": [102,205,170,1], "mediumblue": [0,0,205,1],
  "mediumorchid": [186,85,211,1], "mediumpurple": [147,112,219,1],
  "mediumseagreen": [60,179,113,1], "mediumslateblue": [123,104,238,1],
  "mediumspringgreen": [0,250,154,1], "mediumturquoise": [72,209,204,1],
  "mediumvioletred": [199,21,133,1], "midnightblue": [25,25,112,1],
  "mintcream": [245,255,250,1], "mistyrose": [255,228,225,1],
  "moccasin": [255,228,181,1], "navajowhite": [255,222,173,1],
  "navy": [0,0,128,1], "oldlace": [253,245,230,1],
  "olive": [128,128,0,1], "olivedrab": [107,142,35,1],
  "orange": [255,165,0,1], "orangered": [255,69,0,1],
  "orchid": [218,112,214,1], "palegoldenrod": [238,232,170,1],
  "palegreen": [152,251,152,1], "paleturquoise": [175,238,238,1],
  "palevioletred": [219,112,147,1], "papayawhip": [255,239,213,1],
  "peachpuff": [255,218,185,1], "peru": [205,133,63,1],
  "pink": [255,192,203,1], "plum": [221,160,221,1],
  "powderblue": [176,224,230,1], "purple": [128,0,128,1],
  "red": [255,0,0,1], "rosybrown": [188,143,143,1],
  "royalblue": [65,105,225,1], "saddlebrown": [139,69,19,1],
  "salmon": [250,128,114,1], "sandybrown": [244,164,96,1],
  "seagreen": [46,139,87,1], "seashell": [255,245,238,1],
  "sienna": [160,82,45,1], "silver": [192,192,192,1],
  "skyblue": [135,206,235,1], "slateblue": [106,90,205,1],
  "slategray": [112,128,144,1], "slategrey": [112,128,144,1],
  "snow": [255,250,250,1], "springgreen": [0,255,127,1],
  "steelblue": [70,130,180,1], "tan": [210,180,140,1],
  "teal": [0,128,128,1], "thistle": [216,191,216,1],
  "tomato": [255,99,71,1], "turquoise": [64,224,208,1],
  "violet": [238,130,238,1], "wheat": [245,222,179,1],
  "white": [255,255,255,1], "whitesmoke": [245,245,245,1],
  "yellow": [255,255,0,1], "yellowgreen": [154,205,50,1]}

function clamp_css_byte(i) {  // Clamp to integer 0 .. 255.
  i = Math.round(i);  // Seems to be what Chrome does (vs truncation).
  return i < 0 ? 0 : i > 255 ? 255 : i;
}

function clamp_css_float(f) {  // Clamp to float 0.0 .. 1.0.
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

function parse_css_int(str) {  // int or percentage.
  if (str[str.length - 1] === '%')
    return clamp_css_byte(parseFloat(str) / 100 * 255);
  return clamp_css_byte(parseInt(str));
}

function parse_css_float(str) {  // float or percentage.
  if (str[str.length - 1] === '%')
    return clamp_css_float(parseFloat(str) / 100);
  return clamp_css_float(parseFloat(str));
}

function css_hue_to_rgb(m1, m2, h) {
  if (h < 0) h += 1;
  else if (h > 1) h -= 1;

  if (h * 6 < 1) return m1 + (m2 - m1) * h * 6;
  if (h * 2 < 1) return m2;
  if (h * 3 < 2) return m1 + (m2 - m1) * (2/3 - h) * 6;
  return m1;
}

function parseCSSColor(css_str) {
  // Remove all whitespace, not compliant, but should just be more accepting.
  var str = css_str.replace(/ /g, '').toLowerCase();

  // Color keywords (and transparent) lookup.
  if (str in kCSSColorTable) return kCSSColorTable[str].slice();  // dup.

  // #abc and #abc123 syntax.
  if (str[0] === '#') {
    if (str.length === 4) {
      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xfff)) return null;  // Covers NaN.
      return [((iv & 0xf00) >> 4) | ((iv & 0xf00) >> 8),
              (iv & 0xf0) | ((iv & 0xf0) >> 4),
              (iv & 0xf) | ((iv & 0xf) << 4),
              1];
    } else if (str.length === 7) {
      var iv = parseInt(str.substr(1), 16);  // TODO(deanm): Stricter parsing.
      if (!(iv >= 0 && iv <= 0xffffff)) return null;  // Covers NaN.
      return [(iv & 0xff0000) >> 16,
              (iv & 0xff00) >> 8,
              iv & 0xff,
              1];
    }

    return null;
  }

  var op = str.indexOf('('), ep = str.indexOf(')');
  if (op !== -1 && ep + 1 === str.length) {
    var fname = str.substr(0, op);
    var params = str.substr(op+1, ep-(op+1)).split(',');
    var alpha = 1;  // To allow case fallthrough.
    switch (fname) {
      case 'rgba':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
        // Fall through.
      case 'rgb':
        if (params.length !== 3) return null;
        return [parse_css_int(params[0]),
                parse_css_int(params[1]),
                parse_css_int(params[2]),
                alpha];
      case 'hsla':
        if (params.length !== 4) return null;
        alpha = parse_css_float(params.pop());
        // Fall through.
      case 'hsl':
        if (params.length !== 3) return null;
        var h = (((parseFloat(params[0]) % 360) + 360) % 360) / 360;  // 0 .. 1
        // NOTE(deanm): According to the CSS spec s/l should only be
        // percentages, but we don't bother and let float or percentage.
        var s = parse_css_float(params[1]);
        var l = parse_css_float(params[2]);
        var m2 = l <= 0.5 ? l * (s + 1) : l + s - l * s;
        var m1 = l * 2 - m2;
        return [clamp_css_byte(css_hue_to_rgb(m1, m2, h+1/3) * 255),
                clamp_css_byte(css_hue_to_rgb(m1, m2, h) * 255),
                clamp_css_byte(css_hue_to_rgb(m1, m2, h-1/3) * 255),
                alpha];
      default:
        return null;
    }
  }

  return null;
}

try { exports.parseCSSColor = parseCSSColor } catch(e) { }
