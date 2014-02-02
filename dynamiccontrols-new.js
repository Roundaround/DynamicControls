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
 *    ~ Created internal use namespace DynamicControls/$dc.
 *    ~ Maintained separate internal objects for different control types.
 *    ~ Update internal data on every change.
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

    var DynamicControl = {};
    var $dc = DynamicControl;

    $dc.table = function (container, options) {
        var δ = this,
            Ω = $(container);

        δ.container = Ω;
        δ.original = Ω.contents().clone();
        δ.options = options;
        δ.data = options.initial;

        Ω.addClass('dcContainer');
        Ω.attr('tabindex', 1);

        Ω.click(function (e) {
            δ.deselectAll();
        });

        Ω.find('.dcControlWrapper').click(function (e) {
            e.stopPropagation();
        });
    };

    $dc.table.prototype = {
        _init: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.contents().remove();

            if (δ.data === null)
                δ.data = [].repeat([].repeat(δ.options.placeholder, δ.options.columns), δ.options.rows);

            δ.data = normalizeDoubleArray(δ.data, δ.options.placeholder);

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

        _isDisjoint: function () {
            var Ω = $(this.container),
                δ = this;

            return Ω.find('tr.dcSubSelect').length > 0;
        },

        _registerInputEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('table');
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

                    if (table.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
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
            });

            return δ;
        },

        _registerRowEvents: function (obj) {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('table');
            obj = $(obj);

            obj.click(function (e) {
                e.stopPropagation();
                //Ω.parents().each(function () {
                //    $(this).attr('data-dcScroll', $(this).scrollTop());
                //});
                Ω.focus();
                //Ω.parents().each(function () {
                //    $(this).scrollTop($(this).attr('data-dcScroll')).attr('data-dcScroll', '');
                //});

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
                //Ω.parents().each(function () {
                //    $(this).attr('data-dcScroll', $(this).scrollTop());
                //});
                Ω.focus();
                //Ω.parents().each(function () {
                //    $(this).scrollTop($(this).attr('data-dcScroll')).attr('data-dcScroll', '');
                //});

                δ._toggleInput(this);
            });

            return δ;
        },

        _generateTable: function () {
            var Ω = $(this.container),
                δ = this;

            var wrapper = $(document.createElement('div')).css({ height: '100%', width: '100%', margin: 0, padding: 0 }).appendTo(Ω);
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
                        input.attr('placeholder', δ.data[i][j]);
                        δ._registerInputEvents(input);

                        input.change(function (e) {
                            δ._updateData();
                        });

                    } else {
                        var textarea = $(document.createElement('textarea')).appendTo(tdWrapper);
                        textarea.val(δ.data[i][j]);
                        textarea.attr('placeholder', δ.data[i][j]);
                        textarea.attr('rows', 5);
                        δ._registerInputEvents(textarea);
                        
                        textarea.change(function (e) {
                            δ._updateData();
                        });

                    }
                }

                δ._registerRowEvents(tr);

                Ω.unbind('keydown');
                Ω.keydown(function (e) {
                    if (e.keyCode == 27) { // Escape
                        e.preventDefault();
                        δ.deselectAll();
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
                        if (table.find('.dcSelected,.dcSubSelect').length > 0) {
                            e.preventDefault();
                            δ.remove();
                        }
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
                        if (table.find('.dcSelected,.dcSubSelect').length > 0) {
                            e.preventDefault();
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
                            e.preventDefault();
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

            var table = Ω.find('table');
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

            row = row || 0;
            item = item || 0;
            Ω.find('table').find('.dcSelected,.dcSubSelect').eq(row).find('input[type="text"],textarea').eq(item).focusEnd();

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
                if (Ω.find('table').find('.dcSubSelect').length > 0)
                    δ._deselectSub();
                else
                    δ.deselectAll();
            } else if (Ω.find('table').find('.dcSelected').length == 0) {
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

            if (Ω.find('table').find('.dcSelected,.dcSubSelect').length > 0) {
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

            Ω.find('table').find('tr').removeClass('dcSelected');

            if (Ω.find('table').find('.dcSelected,.dcSubSelect').length == 0) {
                δ._disableMove();
                δ._disableRemove();
            }

            return δ;
        },

        _deselectSub: function () {
            var Ω = $(this.container),
                δ = this;

            Ω.find('table').find('tr').removeClass('dcSubSelect');

            if (Ω.find('table').find('.dcSelected,.dcSubSelect').length == 0) {
                δ._disableMove();
                δ._disableRemove();
            }

            return δ;
        },

        'selectAll': function () {
            var Ω = $(this.container),
                δ = this;

            δ._selectSingle(Ω.find('table').find('tr:first-child'));

            if (Ω.find('table').find('tr').length > 1)
                δ._selectRange(Ω.find('table').find('tr:last-child'));

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

        'moveUp': function (cycle) {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('table');
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

        'moveDown': function (cycle) {
            var Ω = $(this.container),
                δ = this;

            var table = Ω.find('table');
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
                input.val(δ.options.placeholder);
                input.attr('placeholder', δ.options.placeholder);
                δ._registerInputEvents(input);
            }

            var table = Ω.find('table');
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

            var table = Ω.find('table');
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

            Ω.removeClass('dcContainer').removeAttr('tabindex');
            Ω.contents().remove().append(δ.original);
            Ω.removeData('dynamictable');
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

        } else if (typeof arg === 'object') {
            // We are initializing with options.
            var options = $.extend({}, $dc.defaults, arg),
                control = new $dc.table(Ω, options);

            control._init();
            Ω.data('dynamictable', control);
        }

        return Ω;
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
        columns: 2,
        rows: 2
    };

}) (jQuery)
