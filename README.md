#DynamicControls

DynamicControls v1.0.2  
jQuery plugin for creating utilizing advanced data manipulation controls.  
https://github.com/Roundaround/DynamicControls  
http://dynamiccontrols.roundaround.me  
Copyright (c) 2013 Evan Steinkerchner  
Licensed under the LGPL v2.1 license.  

###Changelog
* **1.0.2** *2014-04-29*
    - Cleaned distribution package and repo contents.
    - Added minified copies of .js and .css files. (Issue 14)
    - Implemented setData/Element functions. (Issue 11)
* **1.0.0** *2014-02-03*
    - Completely rewrote to adhere to jQuery plugin standards.
    - Created internal use namespace DynamicControls/$dc.
    - Maintained separate internal objects for different control types.
    - Update internal data on every change.
    - Added/tweaked keyboard controls.
    - Introduced DynamicText - a toggleable input<->textarea control.
    - Added defaulttext option.
    - Initial table input placeholder attributes are now the placeholder option.
* **0.7.4** *2013-08-18*
    - Moved the multi-dimensional array checker outside plugin.
    - Wrapped entire file in local scope to avoid $ conflicts.
    - Checked if browser supports rgba before setting alpha value.
* **0.7.2** *2013-08-08*
    - Moved several functions outside of objects.
    - Wrote color parser function.
    - Made properties private.
    - Removed public accessor for several functions.
    - Added public setter for default data.
    - Removed overwrite property.
    - Made focusColor a property.
    - Fixed selection bug with Ctrl + Del shortcut.
    - Reorganized fetching unique id.
