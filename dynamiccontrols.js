/**
 *  DynamicControls v1.0.2
 *  jQuery Plugin for creating and utilizing advanced data manipulation controls.
 *  https://github.com/Roundaround/DynamicControls
 *  Copyright (c) 2013 Evan Steinkerchner
 *  Licensed under the LGPL v2.1 license.
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
	
	var Keys = {
		A: 65, B: 66, C: 67, D: 68, E: 69,
		F: 70, G: 71, H: 72, I: 73, J: 74,
		K: 75, L: 76, M: 77, N: 78, O: 79,
		P: 80, Q: 81, R: 82, S: 83, T: 84,
		U: 85, V: 86, W: 87, X: 88, Y: 89,
		Z: 90,
		
		_0: 48, _1: 49, _2: 50, _3: 51,
		_4: 52, _5: 53, _6: 54, _7: 55,
		_8: 56, _9: 57,
		
		SPACE: 32, ENTER: 13, TAB: 9,
		ESC: 27, BACKSPACE: 8, SHIFT: 16,
		CONTROL: 17, ALT: 18, CAPSLOCK: 20,
		NUMLOCK: 144, PAGEUP: 33, PAGEDOWN: 34,
		END: 35, HOME: 36, SCROLLLOCK: 145,
		BREAK: 19,
		
		SEMICOLON: 186, EQUAL: 187, COMMA: 188,
		HYPHEN: 189, PERIOD: 190, TILDE: 192,
		APOSTROPHE: 222,
		
		NUM0: 96, NUM1: 97, NUM2: 98, NUM3: 99,
		NUM4: 100, NUM5: 101, NUM6: 102,
		NUM7: 103, NUM8: 104, NUM9: 104,
		
		MULTIPLY: 106, ADD: 107, SUBTRACT: 109,
		DIVIDE: 111, DECIMAL: 110,
		
		F1: 112, F2: 113, F3: 114, F4: 115,
		F5: 116, F6: 117, F7: 118, F8: 119,
		F9: 120, F10: 121, F11: 122, F12: 123
	};

    var DynamicControl = {};
    var $dc = DynamicControl;

    $dc.defaults = {
        initial: null,
        placeholder: '',
        defaulttext: '',
        draggable: true,
        columns: 2,
        rows: 2
    };

    $dc.table = function (container, options) {
        var δ = this,
            Ω = $(container);

        δ.container = Ω;
        δ.original = Ω.contents().clone();
        δ.options = options;
        δ.data = options.initial;
    };

    $dc.table.prototype = {
        _init: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();

            if (δ.data === null)
                δ.data = [].repeat([].repeat(δ.options.defaulttext, δ.options.columns), δ.options.rows);

            δ.data = normalizeDoubleArray(δ.data, δ.options.defaulttext);

            δ._generateTable();

            Ω.addClass('dcContainer');
            Ω.attr('tabindex', 1);

            Ω.click(function (e) {
                δ.deselectAll();
            });

            Ω.find('.dcControlWrapper').click(function (e) {
                e.stopPropagation();
            });

            return δ;
        },

        _isDisjoint: function () {
            var Ω = $(this.container),
                δ = this;

            return Ω.find('tr.dcSubSelect').length > 0;
        },

        _registerInputEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('.dcTable');
            obj = $(obj);

            obj.click(function (e) {
                e.stopPropagation();
            });
            obj.keydown(function (e) {
                e.stopPropagation();
                if (e.keyCode == 27) { // Escape
                    e.preventDefault();

                    Ω.focus();

                } else if (e.keyCode == 13 && e.ctrlKey) { // Ctrl + Enter
                    e.preventDefault();

                    δ._selectSingle($(this).closest('tr'));
                    δ.insert();
                    δ._focusInSelection();

                } else if (e.keyCode == 46 && e.ctrlKey) { // Ctrl + Delete
                    e.preventDefault();

                    δ.remove();

                } else if (e.keyCode == 38 && e.ctrlKey) { // Ctrl + Up
                    e.preventDefault();

                    if (!obj.closest('tr').is('.dcSelected,.dcSubSelect'))
                        δ._selectSingle(obj.closest('tr'));
                    δ.moveUp();
                    obj.focusEnd();

                } else if (e.keyCode == 40 && e.ctrlKey) { // Ctrl + Down
                    e.preventDefault();

                    if (!obj.closest('tr').is('.dcSelected,.dcSubSelect'))
                        δ._selectSingle(obj.closest('tr'));
                    δ.moveDown();
                    obj.focusEnd();

                } else if (e.keyCode == 38 && e.shiftKey) { // Shift + Up
                    e.preventDefault();

                    if (table.find('.dcSelected').length == 0) {
                        δ._deselectSub();
                        δ._selectSingle(table.find('tr:last-child'));
                    } else if (table.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                        if (!table.find('.dcSelected,.dcSubSelect').first().is(':first-child')) {
                            δ._selectRange(table.find('.dcSelected,.dcSubSelect').first().prev());
                        }
                    } else {
                        δ._selectRange(table.find('.dcSelected,.dcSubSelect').last().prev());
                    }

                } else if (e.keyCode == 40 && e.shiftKey) { // Shift + Down
                    e.preventDefault();

                    if (table.find('.dcSelected').length == 0) {
                        δ._deselectSub();
                        δ._selectSingle(table.find('tr:first-child'));
                    } else if (table.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                        if (!table.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                            δ._selectRange(table.find('.dcSelected,.dcSubSelect').last().next());
                        }
                    } else {
                        δ._selectRange(table.find('.dcSelected,.dcSubSelect').first().next());
                    }

                } else if (e.keyCode == 38) { // Up Arrow
                    e.preventDefault();

                    var row = obj.closest('tr');
                    var num = row.find('input[type="text"],textarea').index(obj);
                    if (!row.is(':first-child'))
                        row.prev().find('input[type="text"],textarea').eq(num).focusEnd();
                    else
                        table.find('tr:last-child').find('input[type="text"],textarea').eq(num).focusEnd();

                } else if (e.keyCode == 40) { // Down Arrow
                    e.preventDefault();

                    var row = obj.closest('tr');
                    var num = row.find('input[type="text"],textarea').index(obj);
                    if (!row.is(':last-child'))
                        row.next().find('input[type="text"],textarea').eq(num).focusEnd();
                    else
                        table.find('tr:first-child').find('input[type="text"],textarea').eq(num).focusEnd();

                } else if ((e.keyCode == 84 || e.keyCode == 65) && e.altKey) { // Alt + T / A
                    e.preventDefault();

                    var parent = $(this).parent();
                    δ._toggleInput(parent);
                    parent.find('input[type="text"],textarea').first().focusEnd();

                } else if (e.keyCode == 83 && e.altKey) { // Alt + S
                    e.preventDefault();

                    δ._selectDisjoint($(this).closest('tr'));

                } else if ((e.keyCode == 188 || e.keyCode == 37) && e.ctrlKey) { // Ctrl + < / Left Arrow
                    e.preventDefault();

                    if (!obj.closest('td').is(':first-child'))
                        obj.closest('td').prev().find('input[type="text"],textarea').first().focusEnd();

                } else if ((e.keyCode == 190 || e.keyCode == 39) && e.ctrlKey) { // Ctrl + > / Right Arrow
                    e.preventDefault();

                    if (!obj.closest('td').is(':last-child'))
                        obj.closest('td').next().find('input[type="text"],textarea').first().focusEnd();

                }
            });
            obj.focus(function (e) {
                Ω.addClass('dcFocus');
            });
            obj.blur(function (e) {
                Ω.removeClass('dcFocus');
            });
            obj.change(function (e) {
                Ω.change(e);
                δ._updateData();
            });

            return δ;
        },

        _registerRowEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);

            obj.click(function (e) {
                e.stopPropagation();
                Ω.focus();

                if (e.shiftKey)
                    δ._selectRange($(this));
                else if (e.ctrlKey)
                    δ._selectDisjoint($(this));
                else
                    δ._selectSingle($(this));
            });

            return δ;
        },

        _registerToggleEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj.click(function (e) {
                e.stopPropagation();
                Ω.focus();

                δ._toggleInput(this);
            });

            return δ;
        },

        _generateTable: function () {
            var Ω = $(this.container),
                δ = this;

            var wrapper = $(document.createElement('div')).addClass('dcObjWrapper').appendTo(Ω);
            var table = $(document.createElement('table')).addClass('dcTable').appendTo(wrapper);

            for (i = 0; i < δ.data.length ; i++) {
                var tr = $(document.createElement('tr')).appendTo(table);

                for (j = 0; j < δ.data[0].length ; j++) {
                    var td = $(document.createElement('td')).appendTo(tr);
                    var tdWrapper = $(document.createElement('div')).appendTo(td);
                    var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                    δ._registerToggleEvents(toggle);

                    if (δ.data[i][j].toString().length < 50) {
                        var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                        input.val(δ.data[i][j]);
                        input.attr('placeholder', δ.options.placeholder);
                        δ._registerInputEvents(input);

                    } else {
                        var textarea = $(document.createElement('textarea')).appendTo(tdWrapper);
                        textarea.val(δ.data[i][j]);
                        textarea.attr('placeholder', δ.options.placeholder);
                        textarea.attr('rows', 5);
                        δ._registerInputEvents(textarea);

                    }
                }

                δ._registerRowEvents(tr);

                Ω.unbind('keydown');
                Ω.keydown(function (e) {
                    if (e.keyCode == 27) { // Escape
                        e.preventDefault();
                        if (table.find('.dcSelected,.dcSubSelect').length > 0)
                            δ.deselectAll();
                        else
                            Ω.blur();
                    } else if (e.keyCode == 78) { // N
                        e.preventDefault();
                        if (!δ._isDisjoint())
                            δ.insert();
                    } else if (e.keyCode == 69) { // E
                        e.preventDefault();
                        δ._focusInSelection();
                    } else if (e.keyCode == 9) { // Tab
                        e.preventDefault();
                        δ._focusInSelection();
                    } else if ((e.keyCode == 84 || e.keyCode == 65) && e.altKey) { // Alt + T / A
                        e.preventDefault();
                        table.find('.dcSelected > td,.dcSubSelect > td').each(function () {
                            δ._toggleInput(this);
                        });
                    } else if (e.keyCode == 46) { // Delete
                        e.preventDefault();
                        δ.remove();
                    } else if (e.keyCode == 38 || e.keyCode == 74) { // Up Arrow / J
                        if (table.find('.dcSelected,.dcSubSelect').length > 0) {
                            e.preventDefault();
                            if (e.ctrlKey) { // + Ctrl
                                δ.moveUp();
                            } else if (e.shiftKey) { // + Shift
                                if (table.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                                    if (!table.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                                        δ._selectRange(table.find('.dcSelected,.dcSubSelect').first().prev());
                                    }
                                } else {
                                    δ._selectRange(table.find('.dcSelected,.dcSubSelect').last().prev());
                                }
                            } else {
                                δ._deselectSub();
                                if (table.find('.dcSelected').is(':first-child')) {
                                    δ._selectSingle(table.find('tr:last-child'));
                                } else {
                                    δ._selectSingle(table.find('.dcSelected').prev());
                                }
                            }
                        } else {
                            e.preventDefault();
                            δ._selectSingle(table.find('tr:last-child'));
                        }
                    } else if (e.keyCode == 40 || e.keyCode == 75) { // Down Arrow / K
                        e.preventDefault();
                        if (table.find('.dcSelected,.dcSubSelect').length > 0) {
                            if (e.ctrlKey) { // + Ctrl
                                δ.moveDown();
                            } else if (e.shiftKey) { // + Shift
                                if (table.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                                    if (!table.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                                        δ._selectRange(table.find('.dcSelected,.dcSubSelect').last().next());
                                    }
                                } else {
                                    δ._selectRange(table.find('.dcSelected,.dcSubSelect').first().next());
                                }
                            } else {
                                δ._deselectSub();
                                if (table.find('.dcSelected').is(':last-child')) {
                                    δ._selectSingle(table.find('tr:first-child'));
                                } else {
                                    δ._selectSingle(table.find('.dcSelected').next());
                                }
                            }
                        } else {
                            δ._selectSingle(table.find('tr:first-child'));
                        }
                    }
                    δ._updateData();
                });

                if (δ.options.draggable && $.ui && $.fn.sortable) {
                    table.find('tbody').sortable({
                        axis: 'y',
                        helper: function (e, item) {
                            item.children().each(function () {
                                $(this).width($(this).width());
                            });

                            if (!item.is('.dcSelected,.dcSubSelect')) {
                                δ._selectSingle(item);
                            }

                            var elems = table.find('.dcSelected,.dcSubSelect').clone();
                            item.data('multidrag', elems).siblings('.dcSelected,.dcSubSelect').remove();
                            var helper = $('<tr />');
                            return helper.append(elems);
                        },
                        stop: function (e, ui) {
                            var elems = ui.item.data('multidrag');
                            elems.each(function () {
                                δ._registerRowEvents($(this));
                                δ._registerInputEvents($(this).find('input[type="text"],textarea'));
                                δ._registerToggleEvents($(this).find('.dcToggle'));
                            });
                            ui.item.after(elems).remove();
                            δ._selectSingle(elems.first());
                            if (elems.length > 1)
                                δ._selectRange(elems.last());
                            table.find('tr').hide().show(0);  // Redraw to fix borders
                            Ω.change();
                            δ._updateData();
                        }
                    });
                }
            }

            var controlWrapper = $(document.createElement('div')).addClass('dcControlWrapper').appendTo(wrapper);
            var controlPanel = $(document.createElement('div')).addClass('dcControlPanel').appendTo(controlWrapper);
            var controlList = $(document.createElement('ul')).appendTo(controlPanel);

            var control_select = $(document.createElement('li')).text('Select All').click(function (e) {
                e.stopPropagation();
                δ.selectAll();
            }).appendTo(controlList);

            var control_deselect = $(document.createElement('li')).text('Deselect All').click(function (e) {
                e.stopPropagation();
                δ.deselectAll();
            }).appendTo(controlList);

            var control_moveUp = $(document.createElement('li')).text('Move Up').addClass('dcMove dcDisabled').click(function (e) {
                e.stopPropagation();
                if (!$(this).hasClass('dcDisabled'))
                    δ.moveUp();
            }).appendTo(controlList);

            var control_moveDown = $(document.createElement('li')).text('Move Down').addClass('dcMove dcDisabled').click(function (e) {
                e.stopPropagation();
                if (!$(this).hasClass('dcDisabled'))
                    δ.moveDown();
            }).appendTo(controlList);

            var control_insert = $(document.createElement('li')).text('Insert').addClass('dcInsert').click(function (e) {
                e.stopPropagation();
                if (!$(this).hasClass('dcDisabled')) {
                    δ.insert();
                    δ._focusInSelection();
                }
            }).appendTo(controlList);

            var control_remove = $(document.createElement('li')).text('Remove').addClass('dcRemove dcDisabled').click(function (e) {
                e.stopPropagation();
                δ.remove()
            }).appendTo(controlList);

            return δ;
        },

        _updateData: function () {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('.dcTable');
            var newData = [];
            for (var i = 0; i < table.find('tr').length; i++) {
                var row = [];
                for (var j = 0; j < table.find('tr:first').find('td').length; j++) {
                    row.push(table.find('tr').eq(i).find('td').eq(j).find('input[type="text"],textarea').val());
                }
                newData.push(row);
            }
            δ.data = newData;

            return δ;
        },

        _enableInsert: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcInsert').removeClass('dcDisabled');

            return δ;
        },

        _disableInsert: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcInsert').addClass('dcDisabled');

            return δ;
        },

        _enableMove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcMove').removeClass('dcDisabled');

            return δ;
        },

        _disableMove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcMove').addClass('dcDisabled');

            return δ;
        },

        _enableRemove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcRemove').removeClass('dcDisabled');

            return δ;
        },

        _disableRemove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcRemove').addClass('dcDisabled');

            return δ;
        },

        _focusInSelection: function (row, item) {
            var Ω = $(this.container),
                δ = this;

            if (Ω.find('.dcTable').find('.dcSelected,.dcSubSelect').length == 0)
                Ω.find('.dcTable').find('tr').first().find('input[type="text"],textarea').focusEnd();

            row = row || 0;
            item = item || 0;
            Ω.find('.dcTable').find('.dcSelected,.dcSubSelect').eq(row).find('input[type="text"],textarea').eq(item).focusEnd();

            return δ;
        },

        _toggleInput: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.closest('td');

            var height = Ω.height();

            var control = obj.find('input[type="text"],textarea');

            if (control.prop('tagName') == 'INPUT') {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('textarea')).insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                newControl.attr('rows', 5);
                control.remove();
                δ._registerInputEvents(newControl);
            } else {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('input')).attr('type', 'text').insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                control.remove();
                δ._registerInputEvents(newControl);
            }

            if (Ω.height() != height)
                Ω.resize();

            return δ;
        },

        _selectSingle: function (obj) {
            var Ω = $(this.container),
                δ = this;

            δ.deselectAll();

            δ._enableInsert();
            δ._enableMove();
            δ._enableRemove();

            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            obj.addClass('dcSelected');

            return δ;
        },

        _selectRange: function (obj) {
            var Ω = $(this.container),
                δ = this;

            δ._enableInsert();
            δ._enableMove();
            δ._enableRemove();

            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (obj.hasClass('dcSelected')) {
                if (Ω.find('.dcTable').find('.dcSubSelect').length > 0)
                    δ._deselectSub();
                else
                    δ.deselectAll();
            } else if (Ω.find('.dcTable').find('.dcSelected').length == 0) {
                δ._selectSingle(obj);
            } else {
                δ._deselectSub();

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

            δ._disableInsert();
            δ._enableMove();
            δ._enableRemove();

            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (Ω.find('.dcTable').find('.dcSelected,.dcSubSelect').length > 0) {
                if (obj.is('.dcSelected,.dcSubSelect')) {
                    obj.removeClass('dcSelected').removeClass('dcSubSelect');
                } else {
                    obj.addClass('dcSubSelect');
                }
            } else {
                δ._selectSingle(obj);
            }

            return δ;
        },

        _deselect: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcTable').find('tr').removeClass('dcSelected');

            if (Ω.find('.dcTable').find('.dcSelected,.dcSubSelect').length == 0) {
                δ._disableMove();
                δ._disableRemove();
            }

            return δ;
        },

        _deselectSub: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcTable').find('tr').removeClass('dcSubSelect');

            if (Ω.find('.dcTable').find('.dcSelected,.dcSubSelect').length == 0) {
                δ._disableMove();
                δ._disableRemove();
            }

            return δ;
        },

        _redraw: function() {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();
            δ._generateTable();

            return δ;
        },

        'selectAll': function () {
            var Ω = $(this.container),
                δ = this;

            δ._selectSingle(Ω.find('.dcTable').find('tr:first-child'));

            if (Ω.find('.dcTable').find('tr').length > 1)
                δ._selectRange(Ω.find('.dcTable').find('tr:last-child'));

            δ._enableInsert();

            return δ;
        },

        'deselectAll': function () {
            var Ω = $(this.container),
                δ = this;

            δ._deselect();
            δ._deselectSub();

            δ._enableInsert();

            return δ;
        },

        'getData': function () {
            var Ω = $(this.container),
                δ = this;

            return δ.data;
        },

        'setData': function (newData) {
            var Ω = $(this.container),
                δ = this;

            if (typeof newData === 'undefined' || newData === null)
                newData = [].repeat([].repeat(δ.options.defaulttext, δ.options.columns), δ.options.rows);

            newData = normalizeDoubleArray(newData, δ.options.defaulttext);

            δ.data = newData;
            δ._redraw();
        },

        'setElement': function (column, row, value) {
            var Ω = $(this.container),
                δ = this;

            if (typeof value === 'undefined' || value === null)
                value = δ.options.defaulttext;

            δ.data[row][column] = value;
            δ._redraw();
        },

        'moveUp': function () {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('.dcTable');
            if (table.find('.dcSelected,.dcSubSelect').length > 0 &&
                !table.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                table.find('.dcSelected,.dcSubSelect').each(function () {
                    $(this).insertBefore($(this).prev());
                });
                Ω.change();
            }

            δ._updateData();

            return δ;
        },

        'moveDown': function () {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('.dcTable');
            if (table.find('.dcSelected,.dcSubSelect').length > 0 &&
                !table.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                $(table.find('.dcSelected,.dcSubSelect').get().reverse()).each(function () {
                    $(this).insertAfter($(this).next());
                });
                Ω.change();
            }

            δ._updateData();

            return δ;
        },

        'insert': function () {
            var Ω = $(this.container),
                δ = this;

            var height = Ω.height();

            var tr = $(document.createElement('tr'));

            for (j = 0; j < δ.data[0].length ; j++) {
                var td = $(document.createElement('td')).appendTo(tr);
                var tdWrapper = $(document.createElement('div')).appendTo(td);
                var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                δ._registerToggleEvents(toggle);

                var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                input.val(δ.options.defaulttext);
                input.attr('placeholder', δ.options.placeholder);
                δ._registerInputEvents(input);
            }

            var table = Ω.find('.dcTable');
            if (table.find('tr').length == 0) {
                table.append(tr);
            } else if (table.find('.dcSelected').length == 1) {
                if (table.find('.dcSubSelect').length > 0)
                    table.find('.dcSelected,.dcSubSelect').last().after(tr);
                else
                    table.find('.dcSelected').after(tr);
            } else {
                table.find('tr:last-child').after(tr);
            }

            δ._registerRowEvents(tr);

            δ._selectSingle(tr);
            Ω.change();

            if (Ω.height() != height)
                Ω.resize();

            δ._updateData();

            return δ;
        },

        'remove': function () {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('.dcTable');
            if (table.find('.dcSelected,.dcSubSelect').length > 0 && confirm('Are you sure you wish to delete the selected rows?')) {
                var height = Ω.height();

                table.find('.dcSelected,.dcSubSelect').remove();
                if (table.find('tr').length == 0) {
                    δ.insert();
                } else {
                    δ._enableInsert();
                    δ._disableMove();
                    δ._disableRemove();
                }

                Ω.change();

                if (Ω.height() != height)
                    Ω.resize();
            }

            Ω.focus();

            δ._updateData();

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

            δ.data = δ.options.initial; // For reset.
            Ω.removeClass('dcContainer').removeAttr('tabindex');
            Ω.contents().remove();
            Ω.removeData('dynamictable');

            Ω.append(δ.original);

            return Ω[0];
        }
    };

    $dc.list = function (container, options) {
        var δ = this,
            Ω = $(container);

        δ.container = Ω;
        δ.original = Ω.contents().clone();
        δ.options = options;
        δ.data = options.initial;
    };

    $dc.list.prototype = {
        _init: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();

            if (δ.data === null)
                δ.data = [].repeat(δ.options.defaulttext, δ.options.rows);

            δ._generateList();

            Ω.addClass('dcContainer');
            Ω.attr('tabindex', 1);

            Ω.click(function (e) {
                δ.deselectAll();
            });

            Ω.find('.dcControlWrapper').click(function (e) {
                e.stopPropagation();
            });

            return δ;
        },

        _isDisjoint: function () {
            var Ω = $(this.container),
                δ = this;

            return Ω.find('li.dcSubSelect').length > 0;
        },

        _registerInputEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            var list = Ω.find('.dcList');
            obj = $(obj);

            obj.click(function (e) {
                e.stopPropagation();
            });
            obj.keydown(function (e) {
                e.stopPropagation();
                if (e.keyCode == 27) { // Escape
                    e.preventDefault();

                    Ω.focus();

                } else if (e.keyCode == 13 && e.ctrlKey) { // Ctrl + Enter
                    e.preventDefault();

                    δ._selectSingle($(this).closest('li'));
                    δ.insert();
                    δ._focusInSelection();

                } else if (e.keyCode == 46 && e.ctrlKey) { // Ctrl + Delete
                    e.preventDefault();

                    δ.remove();

                } else if (e.keyCode == 38 && e.ctrlKey) { // Ctrl + Up
                    e.preventDefault();

                    if (!obj.closest('li').is('.dcSelected,.dcSubSelect'))
                        δ._selectSingle(obj.closest('li'));
                    δ.moveUp();
                    obj.focusEnd();

                } else if (e.keyCode == 40 && e.ctrlKey) { // Ctrl + Down
                    e.preventDefault();

                    if (!obj.closest('li').is('.dcSelected,.dcSubSelect'))
                        δ._selectSingle(obj.closest('li'));
                    δ.moveDown();
                    obj.focusEnd();

                } else if (e.keyCode == 38 && e.shiftKey) { // Shift + Up
                    e.preventDefault();

                    if (list.find('.dcSelected').length == 0) {
                        δ._selectSingle(list.find('li:last-child'));
                    } else if (list.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                        if (!list.find('.dcSelected,.dcSubSelect').first().is(':first-child')) {
                            δ._selectRange(list.find('.dcSelected,.dcSubSelect').first().prev());
                        }
                    } else {
                        δ._selectRange(list.find('.dcSelected,.dcSubSelect').last().prev());
                    }

                } else if (e.keyCode == 40 && e.shiftKey) { // Shift + Down
                    e.preventDefault();

                    if (list.find('.dcSelected').length == 0) {
                        δ._selectSingle(list.find('li:first-child'));
                    } else if (list.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                        if (!list.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                            δ._selectRange(list.find('.dcSelected,.dcSubSelect').last().next());
                        }
                    } else {
                        δ._selectRange(list.find('.dcSelected,.dcSubSelect').first().next());
                    }

                } else if (e.keyCode == 38) { // Up Arrow
                    e.preventDefault();

                    var row = obj.closest('li');
                    if (!row.is(':first-child'))
                        row.prev().find('input[type="text"],textarea').first().focusEnd();
                    else
                        list.find('li:last-child').find('input[type="text"],textarea').first().focusEnd();

                } else if (e.keyCode == 40) { // Down Arrow
                    e.preventDefault();

                    var row = obj.closest('li');
                    if (!row.is(':last-child'))
                        row.next().find('input[type="text"],textarea').first().focusEnd();
                    else
                        list.find('li:first-child').find('input[type="text"],textarea').first().focusEnd();

                } else if ((e.keyCode == 84 || e.keyCode == 65) && e.altKey) { // Alt + T / A
                    e.preventDefault();

                    var parent = $(this).parent();
                    δ._toggleInput(parent);
                    parent.find('input[type="text"],textarea').first().focusEnd();

                } else if (e.keyCode == 83 && e.altKey) { // Alt + S
                    e.preventDefault();

                    δ._selectDisjoint($(this).closest('li'));

                }
            });
            obj.focus(function (e) {
                Ω.addClass('dcFocus');
            });
            obj.blur(function (e) {
                Ω.removeClass('dcFocus');
            });
            obj.change(function (e) {
                Ω.change(e);
                δ._updateData();
            });

            return δ;
        },

        _registerRowEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);

            obj.click(function (e) {
                e.stopPropagation();
                Ω.focus();

                if (e.shiftKey)
                    δ._selectRange($(this));
                else if (e.ctrlKey)
                    δ._selectDisjoint($(this));
                else
                    δ._selectSingle($(this));
            });

            return δ;
        },

        _registerToggleEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj.click(function (e) {
                e.stopPropagation();
                Ω.focus();

                δ._toggleInput(this);
            });

            return δ;
        },

        _generateList: function () {
            var Ω = $(this.container),
                δ = this;

            var wrapper = $(document.createElement('div')).addClass('dcObjWrapper').appendTo(Ω);
            var list = $(document.createElement('ul')).addClass('dcList').appendTo(wrapper);

            for (i = 0; i < δ.data.length ; i++) {
                var li = $(document.createElement('li')).appendTo(list);
                var liWrapper = $(document.createElement('div')).appendTo(li);

                var bullet = $(document.createElement('div')).addClass('dcBullet').text('•').appendTo(liWrapper);
                var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
                δ._registerToggleEvents(toggle);

                if (δ.data[i].toString().length < 50) {
                    var input = $(document.createElement('input')).attr('type', 'text').appendTo(liWrapper);
                    input.val(δ.data[i]);
                    input.attr('placeholder', δ.options.placeholder);
                    δ._registerInputEvents(input);
                } else {
                    var textarea = $(document.createElement('textarea')).appendTo(liWrapper);
                    textarea.val(δ.data[i]);
                    textarea.attr('placeholder', δ.options.placeholder);
                    textarea.attr('rows', 5);
                    δ._registerInputEvents(textarea);
                }

                δ._registerRowEvents(li);
            }

            Ω.keydown(function (e) {
                if (e.keyCode == 27) { // Escape
                    e.preventDefault();
                    if (list.find('.dcSelected,.dcSubSelect').length > 0)
                        δ.deselectAll();
                    else
                        Ω.blur();
                } else if (e.keyCode == 78) { // N
                    e.preventDefault();
                    if (!δ._isDisjoint())
                        δ.insert();
                } else if (e.keyCode == 69) { // E
                    e.preventDefault();
                    δ._focusInSelection();
                } else if ((e.keyCode == 84 || e.keyCode == 65) && e.altKey) { // Alt + T / A
                    e.preventDefault();
                    list.find('.dcSelected > div,.dcSubSelect > div').each(function () {
                        δ._toggleInput(this);
                    });
                } else if (e.keyCode == 46) { // Delete
                    e.preventDefault();
                    δ.remove();
                } else if (e.keyCode == 38 || e.keyCode == 74) { // Up Arrow / J
                    e.preventDefault();
                    if (list.find('.dcSelected,.dcSubSelect').length > 0) {
                        if (e.ctrlKey) { // + Ctrl
                            δ.moveUp();
                        } else if (e.shiftKey) { // + Shift
                            if (list.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                                if (!list.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                                    δ._selectRange(list.find('.dcSelected,.dcSubSelect').first().prev());
                                }
                            } else {
                                δ._selectRange(list.find('.dcSelected,.dcSubSelect').last().prev());
                            }
                        } else {
                            δ._deselectSub();
                            if (list.find('.dcSelected').is(':first-child')) {
                                δ._selectSingle(list.find('li:last-child'));
                            } else {
                                δ._selectSingle(list.find('.dcSelected').prev());
                            }
                        }
                    } else {
                        δ._selectSingle(list.find('li:last-child'));
                    }
                } else if (e.keyCode == 40 || e.keyCode == 75) { // Down Arrow / K
                    e.preventDefault();
                    if (list.find('.dcSelected,.dcSubSelect').length > 0) {
                        if (e.ctrlKey) { // + Ctrl
                            δ.moveDown();
                        } else if (e.shiftKey) { // + Shift
                            if (list.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                                if (!list.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                                    δ._selectRange(list.find('.dcSelected,.dcSubSelect').last().next());
                                }
                            } else {
                                δ._selectRange(list.find('.dcSelected,.dcSubSelect').first().next());
                            }
                        } else {
                            δ._deselectSub();
                            if (list.find('.dcSelected').is(':last-child')) {
                                δ._selectSingle(list.find('li:first-child'));
                            } else {
                                δ._selectSingle(list.find('.dcSelected').next());
                            }
                        }
                    } else {
                        δ._selectSingle(list.find('li:first-child'));
                    }
                }
                δ._updateData();
            });

            if (δ.options.draggable && $.ui && $.fn.sortable) {
                list.sortable({
                    axis: 'y',
                    helper: function (e, item) {
                        if (!item.is('.dcSelected,.dcSubSelect')) {
                            δ._selectSingle(item);
                        }

                        var elems = list.find('.dcSelected,.dcSubSelect').clone();
                        item.data('multidrag', elems).siblings('.dcSelected,.dcSubSelect').remove();
                        var helper = $('<li />');
                        return helper.append(elems);
                    },
                    stop: function (e, ui) {
                        var elems = ui.item.data('multidrag');
                        elems.each(function () {
                            δ._registerRowEvents($(this));
                            δ._registerInputEvents($(this).find('input[type="text"],textarea'));
                            δ._registerToggleEvents($(this).find('.dcToggle'));
                        });
                        ui.item.after(elems).remove();
                        δ._selectSingle(elems.first());
                        if (elems.length > 1)
                            δ._selectRange(elems.last());
                        Ω.change();
                        δ._updateData();
                    }
                });
            }

            var controlWrapper = $(document.createElement('div')).addClass('dcControlWrapper').appendTo(wrapper);
            var controlPanel = $(document.createElement('div')).addClass('dcControlPanel').appendTo(controlWrapper);
            var controlList = $(document.createElement('ul')).appendTo(controlPanel);

            var control_select = $(document.createElement('li')).text('Select All').click(function (e) {
                e.stopPropagation();
                δ.selectAll();
            }).appendTo(controlList);

            var control_deselect = $(document.createElement('li')).text('Deselect All').click(function (e) {
                e.stopPropagation();
                δ.deselectAll();
            }).appendTo(controlList);

            var control_moveUp = $(document.createElement('li')).text('Move Up').addClass('dcMove dcDisabled').click(function (e) {
                e.stopPropagation();
                if (!$(this).hasClass('dcDisabled'))
                    δ.moveUp();
            }).appendTo(controlList);

            var control_moveDown = $(document.createElement('li')).text('Move Down').addClass('dcMove dcDisabled').click(function (e) {
                e.stopPropagation();
                if (!$(this).hasClass('dcDisabled'))
                    δ.moveDown();
            }).appendTo(controlList);

            var control_insert = $(document.createElement('li')).text('Insert').addClass('dcInsert').click(function (e) {
                e.stopPropagation();
                if (!$(this).hasClass('dcDisabled')) {
                    δ.insert();
                    δ._focusInSelection();
                }
            }).appendTo(controlList);

            var control_remove = $(document.createElement('li')).text('Remove').addClass('dcRemove dcDisabled').click(function (e) {
                e.stopPropagation();
                δ.remove()
            }).appendTo(controlList);

            return δ;
        },

        _updateData: function () {
            var Ω = $(this.container),
                δ = this;

            var list = Ω.find('.dcList');
            var newData = [];
            for (var i = 0; i < list.find('li').length; i++) {
                newData.push(list.find('li').eq(i).find('input[type="text"],textarea').val());
            }
            δ.data = newData;

            return δ;
        },

        _enableInsert: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcInsert').removeClass('dcDisabled');

            return δ;
        },

        _disableInsert: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcInsert').addClass('dcDisabled');

            return δ;
        },

        _enableMove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcMove').removeClass('dcDisabled');

            return δ;
        },

        _disableMove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcMove').addClass('dcDisabled');

            return δ;
        },

        _enableRemove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcRemove').removeClass('dcDisabled');

            return δ;
        },

        _disableRemove: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcRemove').addClass('dcDisabled');

            return δ;
        },

        _focusInSelection: function (row) {
            var Ω = $(this.container),
                δ = this;

            if (Ω.find('.dcList').find('.dcSelected,.dcSubSelect').length == 0)
                Ω.find('.dcList').find('li').first().find('input[type="text"],textarea').focusEnd();

            row = row || 0;
            Ω.find('.dcList').find('.dcSelected,.dcSubSelect').eq(row).find('input[type="text"],textarea').focusEnd();

            return δ;
        },

        _toggleInput: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.closest('li');

            var height = Ω.height();

            var control = obj.find('input[type="text"],textarea');

            if (control.prop('tagName') == 'INPUT') {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('textarea')).insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                newControl.attr('rows', 5);
                control.remove();
                δ._registerInputEvents(newControl);
            } else {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('input')).attr('type', 'text').insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                control.remove();
                δ._registerInputEvents(newControl);
            }

            if (Ω.height() != height)
                Ω.resize();

            return δ;
        },

        _selectSingle: function (obj) {
            var Ω = $(this.container),
                δ = this;

            δ.deselectAll();

            δ._enableInsert();
            δ._enableMove();
            δ._enableRemove();

            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            obj.addClass('dcSelected');

            return δ;
        },

        _selectRange: function (obj) {
            var Ω = $(this.container),
                δ = this;

            δ._enableInsert();
            δ._enableMove();
            δ._enableRemove();

            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            if (obj.hasClass('dcSelected')) {
                if (Ω.find('.dcList').find('.dcSubSelect').length > 0)
                    δ._deselectSub();
                else
                    δ.deselectAll();
            } else if (Ω.find('.dcList').find('.dcSelected').length == 0) {
                δ._selectSingle(obj);
            } else {
                δ._deselectSub();

                obj.addClass('dcSubSelect');
                var after = obj.nextAll('.dcSelected').length == 1;
                var rows = after ? obj.nextAll('li') : obj.prevAll('li');
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

            δ._disableInsert();
            δ._enableMove();
            δ._enableRemove();

            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            if (Ω.find('.dcList').find('.dcSelected,.dcSubSelect').length > 0) {
                if (obj.is('.dcSelected,.dcSubSelect')) {
                    obj.removeClass('dcSelected').removeClass('dcSubSelect');
                } else {
                    obj.addClass('dcSubSelect');
                }
            } else {
                δ._selectSingle(obj);
            }

            return δ;
        },

        _deselect: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcList').find('li').removeClass('dcSelected');

            if (Ω.find('.dcList').find('.dcSelected,.dcSubSelect').length == 0) {
                δ._disableMove();
                δ._disableRemove();
            }

            return δ;
        },

        _deselectSub: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcList').find('li').removeClass('dcSubSelect');

            if (Ω.find('.dcList').find('.dcSelected,.dcSubSelect').length == 0) {
                δ._disableMove();
                δ._disableRemove();
            }

            return δ;
        },

        _redraw: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();
            δ._generateList();

            return δ;
        },

        'selectAll': function () {
            var Ω = $(this.container),
                δ = this;

            δ._selectSingle(Ω.find('.dcList').find('li:first-child'));

            if (Ω.find('.dcList').find('li').length > 1)
                δ._selectRange(Ω.find('.dcList').find('li:last-child'));

            δ._enableInsert();

            return δ;
        },

        'deselectAll': function () {
            var Ω = $(this.container),
                δ = this;

            δ._deselect();
            δ._deselectSub();

            δ._enableInsert();

            return δ;
        },

        'getData': function () {
            var Ω = $(this.container),
                δ = this;

            return δ.data;
        },

        'setData': function (newData) {
            var Ω = $(this.container),
                δ = this;

            if (typeof newData === 'undefined' || newData === null)
                newData = [].repeat(δ.options.defaulttext, δ.options.rows);

            δ.data = newData;
            δ._redraw();
        },

        'setElement': function (index, value) {
            var Ω = $(this.container),
                δ = this;

            if (typeof value === 'undefined' || value === null)
                value = δ.options.defaulttext;

            δ.data[index] = value;
            δ._redraw();
        },

        'moveUp': function () {
            var Ω = $(this.container),
                δ = this;

            var list = Ω.find('.dcList');
            if (list.find('.dcSelected,.dcSubSelect').length > 0 &&
                !list.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                list.find('.dcSelected,.dcSubSelect').each(function () {
                    $(this).insertBefore($(this).prev());
                });
                Ω.change();
            }

            δ._updateData();

            return δ;
        },

        'moveDown': function () {
            var Ω = $(this.container),
                δ = this;

            var list = Ω.find('.dcList');
            if (list.find('.dcSelected,.dcSubSelect').length > 0 &&
                !list.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                $(list.find('.dcSelected,.dcSubSelect').get().reverse()).each(function () {
                    $(this).insertAfter($(this).next());
                });
                Ω.change();
            }

            δ._updateData();

            return δ;
        },

        'insert': function () {
            var Ω = $(this.container),
                δ = this;

            var height = Ω.height();

            var li = $(document.createElement('li'));
            var liWrapper = $(document.createElement('div')).appendTo(li);

            var bullet = $(document.createElement('div')).addClass('dcBullet').text('•').appendTo(liWrapper);
            var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
            δ._registerToggleEvents(toggle);

            var input = $(document.createElement('input')).attr('type', 'text').appendTo(liWrapper);
            input.val(δ.options.defaulttext);
            input.attr('placeholder', δ.options.placeholder);
            δ._registerInputEvents(input);

            var list = Ω.find('.dcList');
            if (list.find('li').length == 0) {
                list.append(li);
            } else if (list.find('.dcSelected').length == 1) {
                if (list.find('.dcSubSelect').length > 0)
                    list.find('.dcSelected,.dcSubSelect').last().after(li);
                else
                    list.find('.dcSelected').after(li);
            } else {
                list.find('li:last-child').after(li);
            }

            δ._registerRowEvents(li);

            δ._selectSingle(li);
            Ω.change();

            if (Ω.height() != height)
                Ω.resize();

            δ._updateData();

            return δ;
        },

        'remove': function () {
            var Ω = $(this.container),
                δ = this;

            var list = Ω.find('.dcList');
            if (list.find('.dcSelected,.dcSubSelect').length > 0 && confirm('Are you sure you wish to delete the selected rows?')) {
                var height = Ω.height();

                list.find('.dcSelected,.dcSubSelect').remove();
                if (list.find('li').length == 0) {
                    δ.insert();
                } else {
                    δ._enableInsert();
                    δ._disableMove();
                    δ._disableRemove();
                }

                Ω.change();

                if (Ω.height() != height)
                    Ω.resize();
            }

            Ω.focus();

            δ._updateData();

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

            δ.data = δ.options.initial; // For reset.
            Ω.removeClass('dcContainer').removeAttr('tabindex');
            Ω.contents().remove();
            Ω.removeData('dynamiclist');

            Ω.append(δ.original);

            return Ω[0];
        }
    };

    $dc.text = function (container, options) {
        var δ = this,
            Ω = $(container);

        δ.container = Ω;
        δ.original = Ω.contents().clone();
        δ.options = options;
        δ.data = options.initial;
    };

    $dc.text.prototype = {
        _init: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();

            if (δ.data === null)
                δ.data = δ.options.defaulttext;

            δ._generateText();

            Ω.addClass('dcContainer');
            Ω.attr('tabindex', 1);

            return δ;
        },

        _registerInputEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            var list = Ω.find('.dcText');
            obj = $(obj);

            obj.click(function (e) {
                e.stopPropagation();
            });
            obj.keydown(function (e) {
                e.stopPropagation();
                if (e.keyCode == 27) { // Escape
                    e.preventDefault();

                    Ω.focus();

                } else if ((e.keyCode == 84 || e.keyCode == 65) && e.altKey) { // Alt + T / A
                    e.preventDefault();

                    var parent = $(this).parent();
                    δ._toggleInput(parent);
                    parent.find('input[type="text"],textarea').first().focusEnd();

                }
            });
            obj.focus(function (e) {
                Ω.addClass('dcFocus');
            });
            obj.blur(function (e) {
                Ω.removeClass('dcFocus');
            });
            obj.change(function (e) {
                Ω.change(e);
                δ._updateData();
            });

            return δ;
        },

        _registerToggleEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj.click(function (e) {
                e.stopPropagation();
                Ω.focus();

                δ._toggleInput(this);
            });

            return δ;
        },

        _generateText: function () {
            var Ω = $(this.container),
                δ = this;

            var wrapper = $(document.createElement('div')).addClass('dcObjWrapper').appendTo(Ω);
            var text = $(document.createElement('div')).addClass('dcText').appendTo(wrapper);

            var innerWrapper = $(document.createElement('div')).addClass('dcTextInnerWrapper').appendTo(text);
            var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(innerWrapper);
            δ._registerToggleEvents(toggle);

            if (δ.data.toString().length < 50) {
                var input = $(document.createElement('input')).attr('type', 'text').appendTo(innerWrapper);
                input.val(δ.data);
                input.attr('placeholder', δ.options.placeholder);
                δ._registerInputEvents(input);
            } else {
                var textarea = $(document.createElement('textarea')).appendTo(innerWrapper);
                textarea.val(δ.data);
                textarea.attr('placeholder', δ.options.placeholder);
                textarea.attr('rows', 5);
                δ._registerInputEvents(textarea);
            }

            Ω.keydown(function (e) {
                if (e.keyCode == 27) { // Escape
                    e.preventDefault();
                    Ω.blur();
                } else if (e.keyCode == 69) { // E
                    e.preventDefault();
                    δ._focusInput();
                } else if ((e.keyCode == 84 || e.keyCode == 65) && e.altKey) { // Alt + T / A
                    e.preventDefault();
                    δ._toggleInput(Ω.find('.dcText'));
                }
                δ._updateData();
            });
        },

        _updateData: function () {
            var Ω = $(this.container),
                δ = this;

            δ.data = Ω.find('.dcText').find('input[type="text"],textarea').first().val();

            return δ;
        },

        _toggleInput: function (obj) {
            var Ω = $(this.container),
                δ = this;

            obj = $(obj);
            if (obj.hasClass('dcToggle'))
                obj = obj.parent();

            var height = Ω.height();

            var control = obj.find('input[type="text"],textarea');

            if (control.prop('tagName') == 'INPUT') {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('textarea')).insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                newControl.attr('rows', 5);
                control.remove();
                δ._registerInputEvents(newControl);
            } else {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('input')).attr('type', 'text').insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                control.remove();
                δ._registerInputEvents(newControl);
            }

            if (Ω.height() != height)
                Ω.resize();

            return δ;
        },

        _focusInput: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('.dcText').find('input[type="text"],textarea').focusEnd();

            return δ;
        },

        _redraw: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();
            δ._generateText();

            return δ;
        },

        'getData': function () {
            var Ω = $(this.container),
                δ = this;

            return δ.data;
        },

        'setData': function (newData) {
            var Ω = $(this.container),
                δ = this;

            if (typeof newData === 'undefined' || newData === null)
                newData = δ.options.defaulttext;

            δ.data = newData;
            δ._redraw();
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

            δ.data = δ.options.initial; // For reset.
            Ω.removeClass('dcContainer').removeAttr('tabindex');
            Ω.contents().remove();
            Ω.removeData('dynamictext');

            Ω.append(δ.original);

            return Ω[0];
        }
    };

    $.fn.dynamicTable = function () {
        var Ω = $(this);
        if (arguments.length == 0)
            return Ω;

        var arg = arguments[0];

        if (typeof arg === 'string') {
            // We are calling a command here.
            var control = Ω.data('dynamictable'),
                options = $.extend({}, $dc.defaults, control);

            if (!control)
                Ω.data('dynamictable', (control = new $dc.table(Ω, options)))

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

        } else if (typeof arg === 'object') {
            // We are initializing with options.
            var options = $.extend({}, $dc.defaults, arg),
                control = new $dc.table(Ω, options);

            control._init();
            Ω.data('dynamictable', control);
        }

        return Ω;
    };

    $.fn.dynamicList = function () {
        var Ω = $(this);
        if (arguments.length == 0)
            return Ω;

        var arg = arguments[0];

        if (typeof arg === 'string') {
            // We are calling a command here.
            var control = Ω.data('dynamiclist'),
                options = $.extend({}, $dc.defaults, control);

            if (!control)
                Ω.data('dynamiclist', (control = new $dc.list(Ω, options)))

            if (typeof control[arg] !== 'function')
                throw 'Unknown method: ' + arg;
            if (arg.startsWith('_'))
                throw 'Cannot access private method ' + arg + ' from a public context.';

            var temp = control[arg].apply(control, Array.prototype.slice.call(arguments, 1));
            Ω.data('dynamiclist', control);
            return temp;

        } else if ($.isArray(arg)) {
            // We are initializing with initial data.
            var options = $.extend({}, $dc.defaults, { initial: arg }),
                control = new $dc.list(Ω, options);

            control._init();
            Ω.data('dynamiclist', control);

        } else if (typeof arg === 'object') {
            // We are initializing with options.
            var options = $.extend({}, $dc.defaults, arg),
                control = new $dc.list(Ω, options);

            control._init();
            Ω.data('dynamiclist', control);
        }

        return Ω;
    };

    $.fn.dynamicText = function () {
        var Ω = $(this);
        if (arguments.length == 0)
            return Ω;

        var arg = arguments[0];

        if (typeof arg === 'string') {
            // We are calling a command here.
            var control = Ω.data('dynamictext'),
                options = $.extend({}, $dc.defaults, control);

            if (!control)
                Ω.data('dynamictext', (control = new $dc.text(Ω, options)))

            if (typeof control[arg] !== 'function')
                throw 'Unknown method: ' + arg;
            if (arg.startsWith('_'))
                throw 'Cannot access private method ' + arg + ' from a public context.';

            var temp = control[arg].apply(control, Array.prototype.slice.call(arguments, 1));
            Ω.data('dynamictext', control);
            return temp;

        } else if (typeof arg === 'object') {
            // We are initializing with options.
            var options = $.extend({}, $dc.defaults, arg),
                control = new $dc.text(Ω, options);

            control._init();
            Ω.data('dynamictext', control);
        }

        return Ω;
    };

}) (jQuery)
