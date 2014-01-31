/**
 *  DynamicControls v1.0.0
 *  jQuery Plugin for creating and utilizing advanced data manipulation controls.
 *  https://github.com/Roundaround/DynamicControls
 *  Copyright (c) 2013 Evan Steinkerchner
 *  Licensed under the GPL v2 license.
**/

/**
 *  Changelog:
 *
 *  0.7.2:
 *    ~ Moved several functions outside of objects.
 *    ~ Wrote color parser function.
 *    ~ Made properties private.
 *    ~ Removed public accessor for several functions.
 *    ~ Added public setter for default data.
 *    ~ Removed overwrite property.
 *    ~ Made focusColor a property.
 *    ~ Fixed selection bug with Ctrl + Del shortcut.
 *    ~ Reorganized fetching unique id.
 *  0.7.4:
 *    ~ Moved the multi-dimensional array checker outside plugin.
 *    ~ Wrapped entire file in local scope to avoid $ conflicts.
 *    ~ Checked if browser supports rgba before setting alpha value.
 *  1.0.0:
 *    ~ Completely rewrote to adhere to jQuery plugin standards.
**/

(function ($) {

    if (typeof Array.prototype.repeat != 'function') {
        Array.prototype.repeat = function (val, len){
            while (len) this[len--] = val;
            return this;
        };
    }

    function isArrayOfArrays(obj) {
        if (!$.isArray(obj)) return false;

        var flag = true;
        for (var i = 0; i < obj.length ; i++) {
            if (!$.isArray(obj[i])) return false;
        }

        return true;
    }

    function getDepthOfArrays(obj) {
        var depth = 0;
        while ($.isArray(obj)) {
            obj = obj[0];
            depth++;
        }
        return depth;
    }

    function normalizeDoubleArray(obj, filler) {
        var cols = 0,
            rows = obj.length;
        for (var i = 0; i < rows ; i++) {
            cols = Math.max(obj[i].length, cols);
        }

        for (var i = 0; i < rows ; i++) {
            if (!$.isArray(obj[i])) {
                obj[i] = [].repeat(filler, cols);
            } else if (obj[i].length != cols) {
                for (var j = obj[i].length; j < cols ; j++) {
                    obj[i].push(filler);
                }
            }
        }

        return obj;
    }

    if (typeof String.prototype.startsWith != 'function') {
        String.prototype.startsWith = function (str) {
            return this.slice(0, str.length) == str;
        };
    }

    $.fn.setCursorPosition = function (position) {
        if ($(this).length === 0) return this;
        return $(this).setSelection(position, position);
    };

    $.fn.setSelection = function (selectionStart, selectionEnd) {
        if ($(this).length == 0) return this;
        input = $(this)[0];

        if (input.createTextRange) {
            var range = input.createTextRange();
            range.collapse(true);
            range.moveEnd('character', selectionEnd);
            range.moveStart('character', selectionStart);
            range.select();
        } else if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(selectionStart, selectionEnd);
        }

        return this;
    };

    $.fn.focusEnd = function () {
        $(this).setCursorPosition($(this).val().length);
        return this;
    };

    (function (original) {
        $.fn.clone = function () {
            var result = original.apply($(this), arguments),
                my_textareas = $(this).find('textarea').add($(this).filter('textarea')),
                result_textareas = result.find('textarea').add(result.filter('textarea')),
                my_selects = $(this).find('select').add($(this).filter('select')),
                result_selects = result.find('select').add(result.filter('select'));

            for (var i = 0, l = my_textareas.length; i < l; ++i) $(result_textareas[i]).val($(my_textareas[i]).val());
            for (var i = 0, l = my_selects.length; i < l; ++i) result_selects[i].selectedIndex = my_selects[i].selectedIndex;

            return result;
        };
    })($.fn.clone)

    var DynamicControl = function () { };
    var $dc = DynamicControl;

    $dc.table = function (container, options) {
        this.container = $(container);
        this.original = $(container).contents().clone();
        this.options = options;
        this.data = options.initial;
    };

    $dc.table.prototype = {
        _init: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();

            if (δ.data === null)
                δ.data = [].repeat([].repeat(δ.options.placeholder, δ.options.columns), δ.options.rows);

            δ._generateTable();

            return δ;

            //if (δ.data === null) {
            //    switch (this.type) {
            //        case 'table':
            //            δ.data = [].repeat([].repeat(δ.options.placeholder, δ.options.columns), δ.options.rows);
            //            break;
            //        case 'list':
            //            δ.data = [].repeat(δ.options.placeholder, δ.options.rows);
            //            break;
            //        default:
            //            δ.data = δ.options.placeholder;
            //    }
            //}

            //switch (δ.type) {
            //    case 'table':
            //        δ._generateTable();
            //        break;
            //    case 'list':
            //        δ._generateList();
            //        break;
            //    case 'text':
            //        δ._generateText();
            //        break;
            //}

            //return δ;
        },

        _generateTable: function () {
            var Ω = $(this.container),
                δ = this;

            δ.data = normalizeDoubleArray(δ.data, δ.options.placeholder);

            var wrapper = $(document.createElement('div')).css({ height: '100%', width: '100%', margin: 0, padding: 0 }).appendTo(Ω);
            var table = $(document.createElement('table')).addClass('dcTable').appendTo(wrapper);

            for (i = 0; i < δ.data.length ; i++) {
                var tr = $(document.createElement('tr')).appendTo(table);

                for (j = 0; j < δ.data[0].length ; j++) {
                    var td = $(document.createElement('td')).appendTo(tr);
                    var tdWrapper = $(document.createElement('div')).appendTo(td);
                    var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                    //registerEvents('toggle', toggle);

                    if (δ.data[i][j].toString().length < 50) {
                        var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                        input.val(δ.data[i][j]);
                        input.attr('placeholder', δ.data[i][j]);
                        //registerEvents('control', input);
                    } else {
                        var textarea = $(document.createElement('textarea')).appendTo(tdWrapper);
                        textarea.val(δ.data[i][j]);
                        textarea.attr('placeholder', δ.data[i][j]);
                        textarea.attr('rows', 5);
                        //registerEvents('control', textarea);
                    }
                }

                //registerEvents('row', tr);
            }

            var controlWrapper = $(document.createElement('div')).addClass('dcControlWrapper').appendTo(wrapper);
            var controlPanel = $(document.createElement('div')).addClass('dcControlPanel').appendTo(controlWrapper);
            var controlList = $(document.createElement('ul')).appendTo(controlPanel);

            var control_select = $(document.createElement('li')).text('Select All').click(function (e) {
                δ.selectAll();
            }).appendTo(controlList);

            var control_deselect = $(document.createElement('li')).text('Deselect All').click(function (e) {
                δ.deselectAll();
            }).appendTo(controlList);

            var control_moveUp = $(document.createElement('li')).text('Move Up').click(function (e) {
                if (!$(this).hasClass('dcDisabled'))
                    δ.moveUp();
            }).appendTo(controlList);

            var control_moveDown = $(document.createElement('li')).text('Move Down').click(function (e) {
                if (!$(this).hasClass('dcDisabled'))
                    δ.moveDown();
            }).appendTo(controlList);

            var control_insert = $(document.createElement('li')).text('Insert').click(function (e) {
                if (!$(this).hasClass('dcDisabled')) {
                    δ.insert();
                    δ._focusInSelection();
                }
            }).appendTo(controlList);

            var control_remove = $(document.createElement('li')).text('Remove Selected').click(function (e) {
                δ.remove()
            }).appendTo(controlList);

            return δ;
        },

        _enableControls: function () {

        },

        _disableControls: function () {

        },

        _focusInSelection: function () {
            var Ω = $(this.container),
                δ = this;

            return δ;
        },

        _selectSingle: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            δ.deselectAll();
            obj.addClass('dcSelected');

            return δ;
        },

        _selectRange: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (obj.hasClass('dcSelected')) {
                δ.deselectAll();
            } else if (Ω.find('table').find('.dcSelected').length != 1) {
                δ.selectSingle(obj);
            } else {
                δ.deselectAll();

                obj.addClass('dcSubSelect');
                var after = obj.nextAll('.dcSelected').length == 1;
                var rows = after ? obj.nextAll('tr') : obj.prevAll('tr');
                for (var i = 0; i < rows.length; i++) {
                    if (rows.eq(i).hasClass('dcSelected')) return;
                    rows.eq(i).addClass('dcSubSelect');
                }
            }

            return δ;
        },

        _selectDisjoint: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (Ω.find('table').find('.dcSelected,.dcSubSelect').length > 0) {
                δ._disableControls();

                if (obj.is('.dcSelected,.dcSubSelect')) {
                    obj.removeClass('dcSelected').removeClass('dcSubSelect');
                } else {
                    obj.addClass('dcSubSelect');
                }
            } else {
                δ.selectSingle(obj);
            }

            return δ;
        },

        _deselect: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('table').find('tr').removeClass('dcSelected');

            return δ;
        },

        _deselectSub: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('table').find('tr').removeClass('dcSubSelect');

            return δ;
        },

        'selectAll': function () {
            var Ω = $(this.container),
                δ = this;

            δ._selectSingle(Ω.find('table').find('tr:first-child'));
            δ._selectRange(Ω.find('table').find('tr:last-child'));

            δ._enableControls();

            return δ;
        },

        'deselectAll': function () {
            var Ω = $(this.container),
                δ = this;

            δ._deselect();
            δ._deselectSub();

            δ._enableControls();

            return δ;
        },

        'getData': function () {
            var Ω = $(this.container),
                δ = this;

            return δ.data;
        },

        'moveUp': function (cycle) {
            var Ω = $(this.container),
                δ = this;

            if (Ω.find('table').find('.dcSelected,.dcSubSelect').length > 0 &&
                !Ω.find('table').find('.dcSelected,.dcSubSelect').is(':first-child')) {
                Ω.find('table').find('.dcSelected,.dcSubSelect').each(function () {
                    //$(this).insertBefore($(this).prev());
                });
                //Ω.change();
            }

            return δ;
        },

        'moveDown': function (cycle) {
            var Ω = $(this.container),
                δ = this;

            return δ;
        },

        'insert': function () {
            var Ω = $(this.container),
                δ = this;

            return δ;
        },

        'remove': function (confirm) {
            var Ω = $(this.container),
                δ = this;

            return δ;
        },

        'reset': function () {
            var Ω = $(this.container),
                δ = this;

            δ.destroy();
            δ._init();
            return δ;
        },

        'destroy': function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove().append(δ.original);
            Ω.removeData('dynamiccontrol');
            return Ω[0];
        }
    };

    $.fn.dynamicTable = function (arg) {
        var Ω = $(this);
        if (arguments.length == 0)
            return Ω;

        if (typeof arg === 'string') {
            // We are calling a command here.
            var control = Ω.data('dynamictable'),
                options = $.extend({}, $dc.defaults, control);

            if (!control)
                Ω.data('dynamictable', (control = new $dc.table(Ω, 'table', options)))

            if (typeof control[arg] !== 'function')
                throw 'Unknown method: ' + arg;
            if (arg.startsWith('_'))
                throw 'Cannot access private method ' + arg + ' from a public context.';

            var temp = control[arg].apply(control, Array.prototype.slice.call(arguments, 1));
            Ω.data('dynamictable', control);
            return temp;

        } else if (isArrayOfArrays(arg)) {
            // We are initializing with initial data.
            var options = $.extend({}, $dc.defaults, { initial: arg }),
                control = new $dc.table(Ω, options);

            control._init();
            Ω.data('dynamictable', control);
            return Ω;

        } else if (typeof arg === 'object') {
            // We are initializing with options.
            var options = $.extend({}, $dc.defaults, arg),
                control = new $dc.table(Ω, options);

            control._init();
            Ω.data('dynamictable', control);
            return Ω;

        }
    };

    //$.fn.dynamicList = function () {
    //    var option = arguments[0],
    //        args = Array.prototype.slice.call(arguments, 1);

    //    return this.each(function () {
    //        var Ω = $(this),
    //            data = Ω.data('dynamiccontrol'),
    //            options = $.extend({}, defaults, Ω.data(), typeof option === 'object' && option);

    //        if (!data) { Ω.data('dynamiccontrol', (data = new DynamicControl(this, 'list', options.initial, options))); }

    //        if (typeof option === 'string') {
    //            if (typeof data[option] !== 'function')
    //                throw 'Unknown method: ' + option;
    //            if (option.startsWith('_'))
    //                throw 'Cannot access private method ' + option + ' from a public context.';
    //            return data[option].apply(args);
    //        }
    //        data.init();
    //        return this;
    //    });
    //};

    //$.fn.dynamicText = function () {
    //    var option = arguments[0],
    //        args = Array.prototype.slice.call(arguments, 1);

    //    return this.each(function () {
    //        var Ω = $(this),
    //            data = Ω.data('dynamiccontrol'),
    //            options = $.extend({}, defaults, Ω.data(), typeof option === 'object' && option);

    //        if (!data) { Ω.data('dynamiccontrol', (data = new DynamicControl(this, 'text', options.initial, options))); }

    //        if (typeof option === 'string') {
    //            if (typeof data[option] !== 'function')
    //                throw 'Unknown method: ' + option;
    //            if (option.startsWith('_'))
    //                throw 'Cannot access private method ' + option + ' from a public context.';
    //            return data[option].apply(args);
    //        }
    //        data.init();
    //        return this;
    //    });
    //};

    $dc.defaults = {
        initial: null,
        placeholder: '',
        draggable: true,
        dataArray: false,
        columns: 2,
        rows: 2
    };

}) (jQuery)
