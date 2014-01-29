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

    var SELECT = '.dcSelected,.dcSubSelect';

    var DynamicControl = function (container, type, initial, options) {
        this.container = $(container);
        this.original = $(container).contents().clone();
        this.type = type;
        this.data = initial;
        this.options = options;

        function test() {
            alert(1);
        }
    };

    DynamicControl.prototype = {
        _init: function () {
            var Ω = $(this.container);

            Ω.contents().remove();

            if (this.data === null) {
                switch (this.type) {
                    case 'table':
                        this.data = [].repeat([].repeat(this.options.placeholder, this.options.columns), this.options.rows);
                        break;
                    case 'list':
                        this.data = [].repeat(this.options.placeholder, this.options.rows);
                        break;
                    default:
                        this.data = this.options.placeholder;
                }
            }

            switch (this.type) {
                case 'table':
                    this._generateTable();
                    break;
                case 'list':
                    this._generateList();
                    break;
                case 'text':
                    this._generateText();
                    break;
            }

            return this;
        },

        _generateTable: function () {
            var δ = this,
                Ω = $(this.container);

            this.data = normalizeDoubleArray(this.data, this.options.placeholder);

            var wrapper = $(document.createElement('div')).css({ height: '100%', width: '100%', margin: 0, padding: 0 }).appendTo(Ω);
            var table = $(document.createElement('table')).addClass('dcTable').appendTo(wrapper);

            for (i = 0; i < rows() ; i++) {
                var tr = $(document.createElement('tr')).appendTo(table);

                for (j = 0; j < cols() ; j++) {
                    var td = $(document.createElement('td')).appendTo(tr);
                    var tdWrapper = $(document.createElement('div')).appendTo(td);
                    var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                    //registerEvents('toggle', toggle);

                    if (data[i][j].toString().length < 50) {
                        var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                        input.val(this.data[i][j]);
                        input.attr('placeholder', this.data[i][j]);
                        //registerEvents('control', input);
                    } else {
                        var textarea = $(document.createElement('textarea')).appendTo(tdWrapper);
                        textarea.val(this.data[i][j]);
                        textarea.attr('placeholder', this.data[i][j]);
                        textarea.attr('rows', 5);
                        //registerEvents('control', textarea);
                    }
                }

                //registerEvents('row', tr);
            }

            var controlWrapper = $(document.createElement('div')).addClass('dcControlWrapper').appendTo(wrapper);
            var controlPanel = $(document.createElement('div')).addClass('dcControlPanel').appendTo(controlWrapper);
            var controlList = $(document.createElement('ul')).appendTo(controlPanel);

            var control_select = $(document.createElement('li')).text('Select All').click(δ.selectAll).appendTo(controlList);

            var control_deselect = $(document.createElement('li')).text('Deselect All').click(δ.deselect).appendTo(controlList);

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

            var control_remove = $(document.createElement('li')).text('Remove Selected').click(δ.remove()).appendTo(controlList);
        },

        _focusInSelection: function () {

        },

        _selectSingle: function () {

        },

        _selectRange: function () {

        },

        _selectDisjoint: function () {

        },

        'selectAll': function () {

        },

        'deselect': function () {

        },

        'getData': function () {
            return this.data;
        },

        'moveUp': function (cycle) {

        },

        'moveDown': function (cycle) {

        },

        'insert': function () {
            return this;
        },

        'remove': function (confirm) {

        },

        'reset': function () {
            this.de
            this.destroy();
            this._init();
            return this;
        },

        'destroy': function () {
            var Ω = this.container;
            Ω.contents().remove().append(this.original);
            Ω.removeData('dynamiccontrol');
            return Ω[0];
        }
    };

    $.fn.dynamicTable = function () {
        var option = arguments[0],
            args = Array.prototype.slice.call(arguments, 1);

        return this.each(function () {
            var Ω = $(this),
                data = Ω.data('dynamiccontrol'),
                options = $.extend({}, defaults, Ω.data(), typeof option === 'object' && option);

            if (!data) { Ω.data('dynamiccontrol', (data = new DynamicControl(this, 'table',  options.initial, options))); }

            if (typeof option === 'string') {
                if (typeof data[option] !== 'function')
                    throw 'Unknown method: ' + option;
                if (option.startsWith('_'))
                    throw 'Cannot access private method ' + option + ' from a public context.';
                //return data[option].apply(args);
                return 'hm';
            }
            data._init();
            return this;
        });
    };

    $.fn.dynamicList = function () {
        var option = arguments[0],
            args = Array.prototype.slice.call(arguments, 1);

        return this.each(function () {
            var Ω = $(this),
                data = Ω.data('dynamiccontrol'),
                options = $.extend({}, defaults, Ω.data(), typeof option === 'object' && option);

            if (!data) { Ω.data('dynamiccontrol', (data = new DynamicControl(this, 'list', options.initial, options))); }

            if (typeof option === 'string') {
                if (typeof data[option] !== 'function')
                    throw 'Unknown method: ' + option;
                if (option.startsWith('_'))
                    throw 'Cannot access private method ' + option + ' from a public context.';
                return data[option].apply(args);
            }
            data.init();
            return this;
        });
    };

    $.fn.dynamicText = function () {
        var option = arguments[0],
            args = Array.prototype.slice.call(arguments, 1);

        return this.each(function () {
            var Ω = $(this),
                data = Ω.data('dynamiccontrol'),
                options = $.extend({}, defaults, Ω.data(), typeof option === 'object' && option);

            if (!data) { Ω.data('dynamiccontrol', (data = new DynamicControl(this, 'text', options.initial, options))); }

            if (typeof option === 'string') {
                if (typeof data[option] !== 'function')
                    throw 'Unknown method: ' + option;
                if (option.startsWith('_'))
                    throw 'Cannot access private method ' + option + ' from a public context.';
                return data[option].apply(args);
            }
            data.init();
            return this;
        });
    };

    var defaults = {
        initial: null,
        placeholder: '',
        draggable: true,
        dataArray: false,
        columns: 2,
        rows: 2
    };

}) (jQuery)
