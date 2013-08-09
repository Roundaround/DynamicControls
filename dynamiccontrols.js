/// <reference path="Scripts/jquery-2.0.3.js" />
/// <reference path="Scripts/jquery-ui-1.10.3.js" />

/**
 *  DynamicControls v0.7.2
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
**/

(function ($) {

    //#region Utility functions and jQuery.clone fix.

    Array.prototype.repeat = function (val, len) {
        while (len) this[--len] = val;
        return this;
    };

    function isArray(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }

    function parseColor(color) {
        var colorStr;
        if (typeof color === 'string')
            colorStr = color;
        else if (isArray(color)) {
            colorStr = 'rgba(';
            colorStr += (color[0] || '0') + ',';
            colorStr += (color[1] || '0') + ',';
            colorStr += (color[2] || '0') + ',';
            colorStr += (color[3] || '1') + ')';
        } else if ($.isPlainObject(color)) {
            colorStr = 'rgba(';
            colorStr += (color.r || color.red || '0') + ',';
            colorStr += (color.g || color.green || '0') + ',';
            colorStr += (color.b || color.blue || '0') + ',';
            colorStr += (color.a || color.alpha || '1') + ')';
        }
        return colorStr;
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

    //#endregion

    //#region DynamicList

    $.fn.dynamicList = function (args) {
        var Ω = this;
        if (Ω.css('display') !== 'block')
            throw new Error('Invalid container for dynamicList.');

        args = args || {};

        var i, j;

        var defaultData = args.defaultData || 'Enter Data Here.';
        var data = args.data || [].repeat(defaultData, 4);
        var highlightColor = parseColor(args.highlightColor) || 'rgba(220, 220, 0, 0.4)';
        var focusColor = parseColor(args.focusColor) || 'rgb(235, 235, 235)';

        if (!isArray(data))
            throw new Error('Invalid data for dynamicList.');

        function rows() {
            return data.length;
        }

        Ω.contents().remove();
        var id = 0;
        $('[data-dlid]').each(function () {
            id = Math.max(parseInt($(this).attr('data-dlid')), id);
        });
        Ω.attr('data-dlid', ++id);
        var containSelect = '[data-dlid="' + id + '"]';

        var wrapper = $(document.createElement('div')).css({ height: '100%', width: '100%', margin: 0, padding: 0 }).appendTo(Ω);

        var list = $(document.createElement('ul')).addClass('dlList').appendTo(wrapper);

        for (i = 0; i < rows() ; i++) {
            var li = $(document.createElement('li')).appendTo(list);
            var liWrapper = $(document.createElement('div')).appendTo(li);

            var bullet = $(document.createElement('div')).addClass('dlBullet').text('•').appendTo(liWrapper);
            var toggle = $(document.createElement('div')).addClass('dlToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
            registerEvents('toggle', toggle);

            if (data[i].toString().length < 50) {
                var input = $(document.createElement('input')).attr('type', 'text').appendTo(liWrapper);
                input.val(data[i]);
                input.attr('placeholder', data[i]);
                registerEvents('control', input);
            } else {
                var textarea = $(document.createElement('textarea')).appendTo(liWrapper);
                textarea.val(data[i]);
                textarea.attr('placeholder', data[i]);
                textarea.attr('rows', 5);
                registerEvents('control', textarea);
            }

            registerEvents('row', li);
        }

        var controlWrapper = $(document.createElement('div')).addClass('dlControlWrapper').appendTo(wrapper);
        var controlPanel = $(document.createElement('div')).addClass('dlControlPanel').appendTo(controlWrapper);
        var controlList = $(document.createElement('ul')).appendTo(controlPanel);
        var control_select = $(document.createElement('li')).text('Select All').click(selectAll).appendTo(controlList);
        var control_deselect = $(document.createElement('li')).text('Deselect All').click(clearSelection).appendTo(controlList);
        var control_moveUp = $(document.createElement('li')).text('Move Up').click(function (e) {
            if (!$(this).hasClass('dlDisabled'))
                moveUp();
        }).appendTo(controlList);
        var control_moveDown = $(document.createElement('li')).text('Move Down').click(function (e) {
            if (!$(this).hasClass('dlDisabled'))
                moveDown();
        }).appendTo(controlList);
        var control_insertBefore = $(document.createElement('li')).text('Insert Before').click(function (e) {
            if (!$(this).hasClass('dtDisabled')) {
                insertBefore();
                focusInSelection();
            }
        }).appendTo(controlList);
        var control_insertAfter = $(document.createElement('li')).text('Insert After').click(function (e) {
            if (!$(this).hasClass('dtDisabled')) {
                insertAfter();
                focusInSelection();
            }
        }).appendTo(controlList);
        var control_remove = $(document.createElement('li')).text('Remove Selected').click(removeSelected).appendTo(controlList);

        Ω.setDefaultData = function (newDefault) {
            if (typeof newDefault === 'string')
                defaultData = newDefault;
            else if (newDefault.toString)
                defaultData = newDefault.toString;
            else if (newDefault === undefined)
                defaultData = '';
        };

        function disableControls() {
            control_insertBefore.addClass('dlDisabled');
            control_insertAfter.addClass('dlDisabled');
        }

        function enableControls() {
            control_insertBefore.removeClass('dlDisabled');
            control_insertAfter.removeClass('dlDisabled');
        }

        function isDisjoint() {
            return control_insertBefore.hasClass('dlDisabled');
        }

        Ω.selectSingle = selectSingle;
        function selectSingle(obj) {
            Ω.click();
            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            clearSelection();
            obj.addClass('dlSelected');

            enableControls();
        }

        Ω.selectRange = selectRange;
        function selectRange(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            if (obj.hasClass('dlSelected')) {
                clearSubSelect();
            } else if (list.find('.dlSelected').length != 1) {
                selectSingle(obj);
            } else {
                clearSubSelect();

                obj.addClass('dlSubSelect');
                var after = obj.nextAll('.dlSelected').length == 1;
                var rows = after ? obj.nextAll('li') : obj.prevAll('li');
                for (var i = 0; i < rows.length; i++) {
                    if (rows.eq(i).hasClass('dlSelected')) return;
                    rows.eq(i).addClass('dlSubSelect');
                }
            }

            enableControls();
        }

        Ω.selectDisjoint = selectDisjoint;
        function selectDisjoint(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            if (list.find('.dlSelected,.dlSubSelect').length > 0) {
                disableControls();

                if (obj.is('.dlSelected,.dlSubSelect')) {
                    obj.removeClass('dlSelected').removeClass('dlSubSelect');
                } else {
                    obj.addClass('dlSubSelect');
                }
            } else {
                selectSingle(obj);
            }
        }

        Ω.selectAll = selectAll;
        function selectAll() {
            selectSingle(list.find('li:first-child'));
            selectRange(list.find('li:last-child'));

            enableControls();
        }

        Ω.clearSelection = clearSelection;
        function clearSelection() {
            list.find('.dlSelected').removeClass('dlSelected');
            list.find('.dlSubSelect').removeClass('dlSubSelect');

            enableControls();
        }

        Ω.clearSubSelect = clearSubSelect;
        function clearSubSelect() {
            list.find('.dlSubSelect').removeClass('dlSubSelect');

            enableControls();
        }

        Ω.moveUp = moveUp;
        function moveUp() {
            if (list.find('.dlSelected,.dlSubSelect').length > 0 &&
                !list.find('.dlSelected,.dlSubSelect').is(':first-child')) {
                list.find('.dlSelected,.dlSubSelect').each(function () {
                    $(this).insertBefore($(this).prev());
                });
                Ω.change();
            }
        }

        Ω.moveDown = moveDown;
        function moveDown() {
            if (list.find('.dlSelected,.dlSubSelect').length > 0 &&
                !list.find('.dlSelected,.dlSubSelect').is(':last-child')) {
                $(list.find('.dlSelected,.dlSubSelect').get().reverse()).each(function () {
                    $(this).insertAfter($(this).next());
                });
                Ω.change();
            }
        }

        Ω.insertAfter = insertAfter;
        function insertAfter() {
            var height = Ω.height();

            var li = $(document.createElement('li'));
            var liWrapper = $(document.createElement('div')).appendTo(li);

            var bullet = $(document.createElement('div')).addClass('dlBullet').text('•').appendTo(liWrapper);
            var toggle = $(document.createElement('div')).addClass('dlToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
            registerEvents('toggle', toggle);

            var input = $(document.createElement('input')).attr('type', 'text').appendTo(liWrapper);
            input.val(defaultData);
            input.attr('placeholder', defaultData);
            registerEvents('control', input);

            if (list.find('li').length == 0) {
                list.append(li);
            } else if (list.find('.dlSelected').length == 1) {
                if (list.find('.dlSubSelect').length > 0) {
                    list.find('.dlSelected,.dlSubSelect').last().after(li);
                } else {
                    list.find('.dlSelected').after(li);
                }
            } else {
                list.find('li:last-child').after(li);
            }

            registerEvents('row', li);

            selectSingle(li);
            Ω.change();

            if (Ω.height() != height)
                Ω.resize();
        }

        Ω.insertBefore = insertBefore;
        function insertBefore() {
            var height = Ω.height();

            var li = $(document.createElement('li'));
            var liWrapper = $(document.createElement('div')).appendTo(li);

            var bullet = $(document.createElement('div')).addClass('dlBullet').text('•').appendTo(liWrapper);
            var toggle = $(document.createElement('div')).addClass('dlToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
            registerEvents('toggle', toggle);

            var input = $(document.createElement('input')).attr('type', 'text').appendTo(liWrapper);
            input.val(defaultData);
            input.attr('placeholder', defaultData);
            registerEvents('control', input);

            if (list.find('li').length == 0) {
                list.append(li);
            } else if (list.find('.dlSelected').length == 1) {
                if (list.find('.dlSubSelect').length > 0) {
                    list.find('.dlSelected,.dlSubSelect').first().before(li);
                } else {
                    list.find('.dlSelected').before(li);
                }
            } else {
                list.find('li:first-child').before(li);
            }

            registerEvents('row', li);

            selectSingle(li);
            Ω.change();

            if (Ω.height() != height)
                Ω.resize();
        }

        Ω.removeSelected = removeSelected;
        function removeSelected() {
            if (list.find('.dlSelected,.dlSubSelect').length > 0 && confirm('Are you sure you wish to delete the selected rows?')) {

                var height = Ω.height();

                list.find('.dlSelected,.dlSubSelect').remove();
                if (list.find('li').length == 0)
                    insertAfter();

                enableControls();

                Ω.change();

                if (Ω.height() != height)
                    Ω.resize();
            }
        }

        function toggleInput(obj) {
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
                registerEvents('control', newControl);
            } else {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('input')).attr('type', 'text').insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                control.remove();
                registerEvents('control', newControl);
            }

            if (Ω.height() != height)
                Ω.resize();
        }

        Ω.focusInSelection = focusInSelection;
        function focusInSelection(row) {
            row = row || 0;
            list.find('.dlSelected,.dlSubSelect').eq(row).find('input[type="text"],textarea').first().focusEnd();
        }

        Ω.getData = getData;
        function getData() {
            var data = [];
            for (var i = 0; i < list.find('li').length; i++) {
                data.push(list.find('li').eq(i).find('input[type="text"],textarea').val());
            }
            return data;
        }

        function registerEvents(type, obj) {
            obj = $(obj);

            if (type == 'control') {
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
                        selectSingle($(this).closest('li'));
                        insertAfter();
                        focusInSelection();
                    } else if (e.keyCode == 46 && e.ctrlKey) { // Ctrl + Delete
                        e.preventDefault();
                        removeSelected();
                    } else if (e.keyCode == 38 && e.ctrlKey) { // Ctrl + Up
                        e.preventDefault();
                        if (!obj.closest('li').is('.dlSelected,.dlSubSelect'))
                            selectSingle(obj.closest('li'));
                        moveUp();
                        obj.focusEnd();
                    } else if (e.keyCode == 40 && e.ctrlKey) { // Ctrl + Down
                        e.preventDefault();
                        if (!obj.closest('li').is('.dlSelected,.dlSubSelect'))
                            selectSingle(obj.closest('li'));
                        moveDown();
                        obj.focusEnd();
                    } else if (e.keyCode == 38 && e.shiftKey) { // Shift + Up
                        e.preventDefault();
                        if (list.find('.dlSelected,.dlSubSelect').last().is('.dlSelected')) {
                            if (!list.find('.dlSelected,.dlSubSelect').is(':first-child')) {
                                selectRange(list.find('.dlSelected,.dlSubSelect').first().prev());
                            }
                        } else {
                            selectRange(list.find('.dlSelected,.dlSubSelect').last().prev());
                        }
                        obj.focusEnd();
                    } else if (e.keyCode == 40 && e.shiftKey) { // Shift + Down
                        e.preventDefault();
                        if (list.find('.dlSelected,.dlSubSelect').first().is('.dlSelected')) {
                            if (!list.find('.dlSelected,.dlSubSelect').is(':last-child')) {
                                selectRange(list.find('.dlSelected,.dlSubSelect').last().next());
                            }
                        } else {
                            selectRange(list.find('.dlSelected,.dlSubSelect').first().next());
                        }
                    } else if (e.keyCode == 38) { // Up Arrow
                        e.preventDefault();
                        var row = obj.closest('li');
                        var num = row.find('input[type="text"],textarea').index(obj);
                        if (!row.is(':first-child'))
                            row.prev().find('input[type="text"],textarea').eq(num).focusEnd();
                        else
                            list.find('li:last-child').find('input[type="text"],textarea').eq(num).focusEnd();
                    } else if (e.keyCode == 40) { // Down Arrow
                        e.preventDefault();
                        var row = obj.closest('li');
                        var num = row.find('input[type="text"],textarea').index(obj);
                        if (!row.is(':last-child'))
                            row.next().find('input[type="text"],textarea').eq(num).focusEnd();
                        else
                            list.find('li:first-child').find('input[type="text"],textarea').eq(num).focusEnd();
                    } else if (e.keyCode == 84 && e.altKey) { // Alt + T
                        e.preventDefault();
                        var parent = $(this).parent();
                        toggleInput(parent);
                        var newControl = parent.find('input[type="text"],textarea').first();
                        newControl.focusEnd();
                    } else if (e.keyCode == 83 && e.altKey) { // Alt + S
                        e.preventDefault();
                        selectSingle($(this).closest('li'));
                        Ω.focus();
                    }
                });
                obj.focus(function (e) {
                    Ω.css('background-color', 'rgb(235, 235, 235)');
                });
                obj.blur(function (e) {
                    Ω.css('background-color', '');
                });
                obj.change(function (e) {
                    Ω.change(e);
                });
            } else if (type == 'row') {
                obj.click(function (e) {
                    e.stopPropagation();
                    Ω.parents().each(function () {
                        $(this).attr('data-dlScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dlScroll')).attr('data-dlScroll', '');
                    });
                    if (e.shiftKey) {
                        selectRange(this);
                    } else if (e.ctrlKey) {
                        selectDisjoint(this);
                    } else {
                        selectSingle(this);
                    }
                });
            } else if (type == 'toggle') {
                obj.click(function (e) {
                    e.stopPropagation();
                    Ω.parents().each(function () {
                        $(this).attr('data-dlScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dlScroll')).attr('data-dlScroll', '');
                    });
                    toggleInput(this);
                });
            }
        }

        Ω.click(function (e) {
            clearSelection();
        });

        Ω.find('.dlControlWrapper').click(function (e) {
            e.stopPropagation();
        });

        Ω.attr('tabindex', 1);
        Ω.find('*').addClass('dlDisableSelection');

        Ω.keydown(function (e) {
            if (e.keyCode == 27) { // Escape
                e.preventDefault();
                clearSelection();
            } else if (e.keyCode == 78) { // N
                e.preventDefault();
                if (!isDisjoint())
                    insertAfter();
            } else if (list.find('.dlSelected,.dlSubSelect').length > 0) {
                if (e.keyCode == 69) { // E
                    e.preventDefault();
                    focusInSelection();
                } else if (e.keyCode == 84) { // A
                    if (e.altKey) {
                        e.preventDefault();
                        list.find('.dlSelected,.dlSubSelect').each(function () {
                            toggleInput(this);
                        });
                    }
                } else if (e.keyCode == 46) { // Delete
                    removeSelected();
                } else if (e.keyCode == 38) { // Up Arrow
                    if (e.ctrlKey) {
                        moveUp();
                    } else if (e.shiftKey) {
                        e.preventDefault();
                        if (list.find('.dlSelected,.dlSubSelect').last().is('.dlSelected')) {
                            if (!list.find('.dlSelected,.dlSubSelect').is(':first-child')) {
                                selectRange(list.find('.dlSelected,.dlSubSelect').first().prev());
                            }
                        } else {
                            selectRange(list.find('.dlSelected,.dlSubSelect').last().prev());
                        }
                    } else {
                        clearSubSelect();
                        if (list.find('.dlSelected').is(':first-child')) {
                            selectSingle(list.find('li:last-child'));
                        } else {
                            selectSingle(list.find('.dlSelected').prev());
                        }
                    }
                } else if (e.keyCode == 40) { // Down Arrow
                    if (e.ctrlKey) {
                        moveDown();
                    } else if (e.shiftKey) {
                        e.preventDefault();
                        if (list.find('.dlSelected,.dlSubSelect').first().is('.dlSelected')) {
                            if (!list.find('.dlSelected,.dlSubSelect').is(':last-child')) {
                                selectRange(list.find('.dlSelected,.dlSubSelect').last().next());
                            }
                        } else {
                            selectRange(list.find('.dlSelected,.dlSubSelect').first().next());
                        }
                    } else {
                        clearSubSelect();
                        if (list.find('.dlSelected').is(':last-child')) {
                            selectSingle(list.find('li:first-child'));
                        } else {
                            selectSingle(list.find('.dlSelected').next());
                        }
                    }
                }
            } else if (e.keyCode == 38) { // Up Arrow
                e.preventDefault();
                selectSingle(list.find('li:last-child'));
            } else if (e.keyCode == 40) { // Down Arrow
                e.preventDefault();
                selectSingle(list.find('li:first-child'));
            }
        });

        if ($.ui && $.fn.sortable) {
            list.sortable({
                axis: 'y',
                helper: function (e, item) {
                    if (!item.is('.dlSelected,.dlSubSelect')) {
                        selectSingle(item);
                    }

                    var elems = list.find('.dlSelected,.dlSubSelect').clone();
                    item.data('multidrag', elems).siblings('.dlSelected,.dlSubSelect').remove();
                    var helper = $('<li />');
                    return helper.append(elems);
                },
                stop: function (e, ui) {
                    var elems = ui.item.data('multidrag');
                    elems.each(function () {
                        registerEvents('row', this);
                        registerEvents('control', $(this).find('input[type="text"],textarea'));
                        registerEvents('toggle', $(this).find('.dlToggle'));
                    });
                    ui.item.after(elems).remove();
                    selectSingle(elems.first());
                    selectRange(elems.last());
                    Ω.change();
                }
            });
        }

        var style = $([
            '<style type="text/css">',
            '    ' + containSelect + ' {',
            '        padding: 10px;',
            '    }',
            '    ' + containSelect + ':focus {',
            '        background-color: rgb(235, 235, 235);',
            '        outline: none;',
            '    }',
            '    ' + containSelect + ' > div {',
            '        overflow: hidden;',
            '    }',
            '    ' + containSelect + ' .dlSelected {',
            '        background-color: ' + highlightColor + ';',
            '    }',
            '    ' + containSelect + ' .dlSubSelect {',
            '        background-color: ' + highlightColor + ';',
            '    }',
            '    ' + containSelect + ' .dlDisableSelection {',
            '        -moz-user-select: none;',
            '        -ms-user-select: none;',
            '        -webkit-user-select: none;',
            '        user-select: none;',
            '    }',
            '    ' + containSelect + ' .dlList {',
            '        position: relative;',
            '        border: 1px solid black;',
            '        width: 90%;',
            '        width: -moz-calc(100% - 200px);',
            '        width: -webkit-calc(100% - 200px);',
            '        width: calc(100% - 200px);',
            '        margin: 0;',
            '        padding: 0;',
            '        float: left;',
            '        background-color: white;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '    }',
            '    ' + containSelect + ' .dlList li {',
            '        list-style-type: none;',
            '    }',
            '    ' + containSelect + ' .dlList li > div {',
            '        position: relative;',
            '        height: 100%;',
            '        width: 100%;',
            '        margin: 0;',
            '        padding: 4px 20px;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '    }',
            '    ' + containSelect + ' .dlList .dlBullet {',
            '        position: absolute;',
            '        top: 50%;',
            '        left: 4px;',
            '        -moz-transform: translate(0, -50%);',
            '        -ms-transform: translate(0, -50%);',
            '        -o-transform: translate(0, -50%);',
            '        -webkit-transform: translate(0, -50%);',
            '        transform: translate(0, -50%);',
            '        cursor: default;',
            '    }',
            '    ' + containSelect + ' .dlList .dlToggle {',
            '        position: absolute;',
            '        top: 6px;',
            '        right: 5px;',
            '        border: 1px solid black;',
            '        height: 5px;',
            '        width: 5px;',
            '        cursor: pointer;',
            '        background-color: white;',
            '    }',
            '    ' + containSelect + ' .dlList .dlToggle:hover {',
            '        background-color: rgb(220, 220, 220);',
            '    }',
            '    ' + containSelect + ' .dlList input[type="text"] {',
            '        width: 100%;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '        -moz-user-select: text;',
            '        -ms-user-select: text;',
            '        -webkit-user-select: text;',
            '        user-select: text;',
            '    }',
            '    ' + containSelect + ' .dlList textarea {',
            '        resize: none;',
            '        width: 100%;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '        -moz-user-select: text;',
            '        -ms-user-select: text;',
            '        -webkit-user-select: text;',
            '        user-select: text;',
            '    }',
            '    ' + containSelect + ' .dlControlWrapper {',
            '        width: 10%;',
            '        width: -moz-calc(200px);',
            '        width: -webkit-calc(200px);',
            '        width: calc(200px);',
            '        padding-left: 10px;',
            '        float: right;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '    }',
            '    ' + containSelect + ' .dlControlPanel {',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '    }',
            '    ' + containSelect + ' .dlControlPanel ul {',
            '        margin: 6px;',
            '        padding: 0;',
            '        text-align: center;',
            '    }',
            '    ' + containSelect + ' .dlControlPanel li {',
            '        list-style-type: none;',
            '        margin: 2px;',
            '        cursor: pointer;',
            '    }',
            '    ' + containSelect + ' .dlControlPanel li:hover {',
            '        background-color: rgba(0, 0, 0, 0.1);',
            '    }',
            '    ' + containSelect + ' .dlDisabled {',
            '        color: rgb(120, 120, 120);',
            '        cursor: default !important;',
            '    }',
            '    ' + containSelect + ' .dlDisabled:hover {',
            '        background-color: inherit !important;',
            '    }',
            '</style>'
        ].join('\r\n')).appendTo('head');

        return Ω;
    }

    //#endregion

    //#region DynamicTable

    $.fn.dynamicTable = function (args) {
        var Ω = this;
        if (Ω.css('display') !== 'block')
            throw new Error('Invalid container for dynamicTable.');

        args = args || {};

        var i, j;

        var defaultData = args.defaultData || 'Enter Data Here.';
        var data = args.data || [].repeat([].repeat(defaultData, 2), 2);
        var highlightColor = parseColor(args.highlightColor) || 'rgba(220, 220, 0, 0.4)';
        var focusColor = parseColor(args.focusColor) || 'rgb(235, 235, 235)';

        function isArray(obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        }

        function isDataDoubleArray() {
            if (!isArray(data)) return false;

            var flag = true;
            for (var i = 0; i < rows() ; i++) {
                if (!isArray(data[i])) return false;
            }

            return true;
        }

        if (!isDataDoubleArray())
            throw new Error('Invalid data for dynamicTable.');

        function rows() {
            return data.length;
        }

        function cols() {
            var max = 0;
            for (var i = 0; i < rows() ; i++) {
                max = Math.max(data[i].length, max);
            }
            return max;
        }

        function normalizeData() {
            for (var i = 0; i < rows() ; i++) {
                if (!isArray(data[i])) {
                    data[i] = [].repeat(defaultData, cols());
                } else if (data[i].length != cols()) {
                    for (var j = data[i].length; j < cols() ; j++) {
                        data[i].push(defaultData);
                    }
                }
            }
        }

        normalizeData();
        Ω.contents().remove();
        var id = 0;
        $('[data-dtid]').each(function () {
            id = Math.max(parseInt($(this).attr('data-dtid')), id);
        });
        Ω.attr('data-dtid', ++id);
        var containSelect = '[data-dtid="' + id + '"]';

        var wrapper = $(document.createElement('div')).css({ height: '100%', width: '100%', margin: 0, padding: 0 }).appendTo(Ω);
        var table = $(document.createElement('table')).addClass('dtTable').appendTo(wrapper);

        for (i = 0; i < rows() ; i++) {
            var tr = $(document.createElement('tr')).appendTo(table);

            for (j = 0; j < cols() ; j++) {
                var td = $(document.createElement('td')).appendTo(tr);
                var tdWrapper = $(document.createElement('div')).appendTo(td);
                var toggle = $(document.createElement('div')).addClass('dtToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                registerEvents('toggle', toggle);

                if (data[i][j].toString().length < 50) {
                    var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                    input.val(data[i][j]);
                    input.attr('placeholder', data[i][j]);
                    registerEvents('control', input);
                } else {
                    var textarea = $(document.createElement('textarea')).appendTo(tdWrapper);
                    textarea.val(data[i][j]);
                    textarea.attr('placeholder', data[i][j]);
                    textarea.attr('rows', 5);
                    registerEvents('control', textarea);
                }
            }

            registerEvents('row', tr);
        }

        var controlWrapper = $(document.createElement('div')).addClass('dtControlWrapper').appendTo(wrapper);
        var controlPanel = $(document.createElement('div')).addClass('dtControlPanel').appendTo(controlWrapper);
        var controlList = $(document.createElement('ul')).appendTo(controlPanel);
        var control_select = $(document.createElement('li')).text('Select All').click(selectAll).appendTo(controlList);
        var control_deselect = $(document.createElement('li')).text('Deselect All').click(clearSelection).appendTo(controlList);
        var control_moveUp = $(document.createElement('li')).text('Move Up').click(function (e) {
            if (!$(this).hasClass('dtDisabled'))
                moveUp();
        }).appendTo(controlList);
        var control_moveDown = $(document.createElement('li')).text('Move Down').click(function (e) {
            if (!$(this).hasClass('dtDisabled'))
                moveDown();
        }).appendTo(controlList);
        var control_insertBefore = $(document.createElement('li')).text('Insert Before').click(function (e) {
            if (!$(this).hasClass('dtDisabled')) {
                insertBefore();
                focusInSelection();
            }
        }).appendTo(controlList);
        var control_insertAfter = $(document.createElement('li')).text('Insert After').click(function (e) {
            if (!$(this).hasClass('dtDisabled')) {
                insertAfter();
                focusInSelection();
            }
        }).appendTo(controlList);
        var control_remove = $(document.createElement('li')).text('Remove Selected').click(removeSelected).appendTo(controlList);

        Ω.setDefaultData = function (newDefault) {
            if (typeof newDefault === 'string')
                defaultData = newDefault;
            else if (newDefault.toString)
                defaultData = newDefault.toString;
            else if (newDefault === undefined)
                defaultData = '';
        };

        function disableControls() {
            control_insertBefore.addClass('dtDisabled');
            control_insertAfter.addClass('dtDisabled');
        }

        function enableControls() {
            control_insertBefore.removeClass('dtDisabled');
            control_insertAfter.removeClass('dtDisabled');
        }

        function isDisjoint() {
            return control_insertBefore.hasClass('dtDisabled');
        }

        Ω.selectSingle = selectSingle;
        function selectSingle(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            clearSelection();
            obj.addClass('dtSelected');

            enableControls();
        }

        Ω.selectRange = selectRange;
        function selectRange(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (obj.hasClass('dtSelected')) {
                clearSubSelect();
            } else if (table.find('.dtSelected').length != 1) {
                selectSingle(obj);
            } else {
                clearSubSelect();

                obj.addClass('dtSubSelect');
                var after = obj.nextAll('.dtSelected').length == 1;
                var rows = after ? obj.nextAll('tr') : obj.prevAll('tr');
                for (var i = 0; i < rows.length; i++) {
                    if (rows.eq(i).hasClass('dtSelected')) return;
                    rows.eq(i).addClass('dtSubSelect');
                }
            }

            enableControls();
        }

        Ω.selectDisjoint = selectDisjoint;
        function selectDisjoint(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (table.find('.dtSelected,.dtSubSelect').length > 0) {
                disableControls();

                if (obj.is('.dtSelected,.dtSubSelect')) {
                    obj.removeClass('dtSelected').removeClass('dtSubSelect');
                } else {
                    obj.addClass('dtSubSelect');
                }
            } else {
                selectSingle(obj);
            }
        }

        Ω.selectAll = selectAll;
        function selectAll() {
            selectSingle(table.find('tr:first-child'));
            selectRange(table.find('tr:last-child'));

            enableControls();
        }

        Ω.clearSelection = clearSelection;
        function clearSelection() {
            table.find('.dtSelected').removeClass('dtSelected');
            table.find('.dtSubSelect').removeClass('dtSubSelect');

            enableControls();
        }

        Ω.clearSubSelect = clearSubSelect;
        function clearSubSelect() {
            table.find('.dtSubSelect').removeClass('dtSubSelect');

            enableControls();
        }

        Ω.moveUp = moveUp;
        function moveUp() {
            if (table.find('.dtSelected,.dtSubSelect').length > 0 &&
                !table.find('.dtSelected,.dtSubSelect').is(':first-child')) {
                table.find('.dtSelected,.dtSubSelect').each(function () {
                    $(this).insertBefore($(this).prev());
                });
                Ω.change();
            }
        }

        Ω.moveDown = moveDown;
        function moveDown() {
            if (table.find('.dtSelected,.dtSubSelect').length > 0 &&
                !table.find('.dtSelected,.dtSubSelect').is(':last-child')) {
                $(table.find('.dtSelected,.dtSubSelect').get().reverse()).each(function () {
                    $(this).insertAfter($(this).next());
                });
                Ω.change();
            }
        }

        Ω.insertAfter = insertAfter;
        function insertAfter() {
            var tr = $(document.createElement('tr'));

            for (j = 0; j < cols() ; j++) {
                var td = $(document.createElement('td')).appendTo(tr);
                var tdWrapper = $(document.createElement('div')).appendTo(td);
                var toggle = $(document.createElement('div')).addClass('dtToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                registerEvents('toggle', toggle);

                var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                input.val(defaultData);
                input.attr('placeholder', defaultData);
                registerEvents('control', input);
            }

            if (table.find('tr').length == 0) {
                table.append(tr);
            } else if (table.find('.dtSelected').length == 1) {
                if (table.find('.dtSubSelect').length > 0) {
                    table.find('.dtSelected,.dtSubSelect').last().after(tr);
                } else {
                    table.find('.dtSelected').after(tr);
                }
            } else {
                table.find('tr:last-child').after(tr);
            }

            registerEvents('row', tr);

            selectSingle(tr);
            Ω.change();
        }

        Ω.insertBefore = insertBefore;
        function insertBefore() {
            var tr = $(document.createElement('tr'));

            for (j = 0; j < cols() ; j++) {
                var td = $(document.createElement('td')).appendTo(tr);
                var tdWrapper = $(document.createElement('div')).appendTo(td);
                var toggle = $(document.createElement('div')).addClass('dtToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                registerEvents('toggle', toggle);

                var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                input.val(defaultData);
                input.attr('placeholder', defaultData);
                registerEvents('control', input);
            }

            if (table.find('tr').length == 0) {
                table.append(tr);
            } else if (table.find('.dtSelected').length == 1) {
                if (table.find('.dtSubSelect').length > 0) {
                    table.find('.dtSelected,.dtSubSelect').first().before(tr);
                } else {
                    table.find('.dtSelected').before(tr);
                }
            } else {
                table.find('tr:first-child').before(tr);
            }

            registerEvents('row', tr);

            selectSingle(tr);
            Ω.change();
        }

        Ω.removeSelected = removeSelected;
        function removeSelected() {
            if (table.find('.dtSelected,.dtSubSelect').length > 0) {
                if (confirm('Are you sure you wish to delete the selected rows?')) {
                    table.find('.dtSelected,.dtSubSelect').remove();
                    if (table.find('tr').length == 0)
                        insertAfter();
                }

                enableControls();
                Ω.change();
            }
        }

        function toggleInput(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.closest('td');

            var control = obj.find('input[type="text"],textarea');

            if (control.prop('tagName') == 'INPUT') {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('textarea')).insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                newControl.attr('rows', 5);
                control.remove();
                registerEvents('control', newControl);
            } else {
                var text = control.val();
                var placeholder = control.attr('placeholder');
                var newControl = $(document.createElement('input')).attr('type', 'text').insertAfter(control);
                newControl.val(text);
                newControl.attr('placeholder', placeholder);
                control.remove();
                registerEvents('control', newControl);
            }
        }

        Ω.focusInSelection = focusInSelection;
        function focusInSelection(row, item) {
            row = row || 0;
            item = item || 0;
            table.find('.dtSelected,.dtSubSelect').eq(row).find('input[type="text"],textarea').eq(item).focusEnd();
        }

        Ω.getData = getData;
        function getData() {
            var data = [];
            for (var i = 0; i < table.find('tr').length; i++) {
                var row = [];
                for (var j = 0; j < table.find('tr:first').find('td').length; j++) {
                    row.push(table.find('tr').eq(i).find('td').eq(j).find('input[type="text"],textarea').val());
                }
                data.push(row);
            }
            return data;
        }

        function registerEvents(type, obj) {
            obj = $(obj);

            if (type == 'control') {
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
                        selectSingle($(this).closest('tr'));
                        insertAfter();
                        focusInSelection();
                    } else if (e.keyCode == 46 && e.ctrlKey) { // Ctrl + Delete
                        e.preventDefault();
                        removeSelected();
                    } else if (e.keyCode == 38 && e.ctrlKey) { // Ctrl + Up
                        e.preventDefault();
                        if (!obj.closest('tr').is('.dtSelected,.dtSubSelect'))
                            selectSingle(obj.closest('tr'));
                        moveUp();
                        obj.focusEnd();
                    } else if (e.keyCode == 40 && e.ctrlKey) { // Ctrl + Down
                        e.preventDefault();
                        if (!obj.closest('tr').is('.dtSelected,.dtSubSelect'))
                            selectSingle(obj.closest('tr'));
                        moveDown();
                        obj.focusEnd();
                    } else if (e.keyCode == 38 && e.shiftKey) { // Shift + Up
                        e.preventDefault();
                        if (table.find('.dtSelected,.dtSubSelect').last().is('.dtSelected')) {
                            if (!table.find('.dtSelected,.dtSubSelect').is(':first-child')) {
                                selectRange(table.find('.dtSelected,.dtSubSelect').first().prev());
                            }
                        } else {
                            selectRange(table.find('.dtSelected,.dtSubSelect').last().prev());
                        }
                    } else if (e.keyCode == 40 && e.shiftKey) { // Shift + Down
                        e.preventDefault();
                        if (table.find('.dtSelected,.dtSubSelect').first().is('.dtSelected')) {
                            if (!table.find('.dtSelected,.dtSubSelect').is(':last-child')) {
                                selectRange(table.find('.dtSelected,.dtSubSelect').last().next());
                            }
                        } else {
                            selectRange(table.find('.dtSelected,.dtSubSelect').first().next());
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
                    } else if (e.keyCode == 84 && e.altKey) { // Alt + T
                        e.preventDefault();
                        var parent = $(this).parent();
                        toggleInput(parent);
                        var newControl = parent.find('input[type="text"],textarea').first();
                        newControl.focusEnd();
                    } else if (e.keyCode == 83 && e.altKey) { // Alt + S
                        e.preventDefault();
                        selectSingle($(this).closest('tr'));
                        Ω.focus();
                    }
                });
                obj.focus(function (e) {
                    Ω.css('background-color', 'rgb(235, 235, 235)');
                });
                obj.blur(function (e) {
                    Ω.css('background-color', '');
                });
                obj.change(function (e) {
                    Ω.change(e);
                });
            } else if (type == 'row') {
                obj.click(function (e) {
                    e.stopPropagation();
                    Ω.parents().each(function () {
                        $(this).attr('data-dtScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dtScroll')).attr('data-dtScroll', '');
                    });
                    if (e.shiftKey) {
                        selectRange(this);
                    } else if (e.ctrlKey) {
                        selectDisjoint(this);
                    } else {
                        selectSingle(this);
                    }
                });
            } else if (type == 'toggle') {
                obj.click(function (e) {
                    e.stopPropagation();
                    Ω.parents().each(function () {
                        $(this).attr('data-dtScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dtScroll')).attr('data-dtScroll', '');
                    });
                    toggleInput(this);
                });
            }
        }

        Ω.click(function (e) {
            clearSelection();
        });

        Ω.find('.dtControlWrapper').click(function (e) {
            e.stopPropagation();
        });

        Ω.attr('tabindex', 1);
        Ω.find('*').addClass('dtDisableSelection');

        Ω.keydown(function (e) {
            if (e.keyCode == 27) { // Escape
                e.preventDefault();
                clearSelection();
            } else if (e.keyCode == 78) { // N
                e.preventDefault();
                if (!isDisjoint())
                    insertAfter();
            } else if (table.find('.dtSelected,.dtSubSelect').length > 0) {
                if (e.keyCode == 69) { // E
                    e.preventDefault();
                    focusInSelection();
                } else if (e.keyCode == 84) { // T
                    if (e.altKey) {
                        e.preventDefault();
                        table.find('.dtSelected > td,.dtSubSelect > td').each(function () {
                            toggleInput(this);
                            // TODO: Decide if this is necessary.
                        });
                    }
                } else if (e.keyCode == 46) { // Delete
                    removeSelected();
                } else if (e.keyCode == 38) { // Up Arrow
                    if (e.ctrlKey) {
                        moveUp();
                    } else if (e.shiftKey) {
                        e.preventDefault();
                        if (table.find('.dtSelected,.dtSubSelect').last().is('.dtSelected')) {
                            if (!table.find('.dtSelected,.dtSubSelect').is(':first-child')) {
                                selectRange(table.find('.dtSelected,.dtSubSelect').first().prev());
                            }
                        } else {
                            selectRange(table.find('.dtSelected,.dtSubSelect').last().prev());
                        }
                    } else {
                        clearSubSelect();
                        if (table.find('.dtSelected').is(':first-child')) {
                            selectSingle(table.find('tr:last-child'));
                        } else {
                            selectSingle(table.find('.dtSelected').prev());
                        }
                    }
                } else if (e.keyCode == 40) { // Down Arrow
                    if (e.ctrlKey) {
                        moveDown();
                    } else if (e.shiftKey) {
                        e.preventDefault();
                        if (table.find('.dtSelected,.dtSubSelect').first().is('.dtSelected')) {
                            if (!table.find('.dtSelected,.dtSubSelect').is(':last-child')) {
                                selectRange(table.find('.dtSelected,.dtSubSelect').last().next());
                            }
                        } else {
                            selectRange(table.find('.dtSelected,.dtSubSelect').first().next());
                        }
                    } else {
                        clearSubSelect();
                        if (table.find('.dtSelected').is(':last-child')) {
                            selectSingle(table.find('tr:first-child'));
                        } else {
                            selectSingle(table.find('.dtSelected').next());
                        }
                    }
                }
            } else if (e.keyCode == 38) { // Up Arrow
                e.preventDefault();
                selectSingle(table.find('tr:last-child'));
            } else if (e.keyCode == 40) { // Down Arrow
                e.preventDefault();
                selectSingle(table.find('tr:first-child'));
            }
        });

        if ($.ui && $.fn.sortable) {
            table.find('tbody').sortable({
                axis: 'y',
                helper: function (e, item) {
                    item.children().each(function () {
                        $(this).width($(this).width());
                    });

                    if (!item.is('.dtSelected,.dtSubSelect')) {
                        selectSingle(item);
                    }

                    var elems = table.find('.dtSelected,.dtSubSelect').clone();
                    item.data('multidrag', elems).siblings('.dtSelected,.dtSubSelect').remove();
                    var helper = $('<tr />');
                    return helper.append(elems);
                },
                stop: function (e, ui) {
                    var elems = ui.item.data('multidrag');
                    elems.each(function () {
                        registerEvents('row', this);
                        registerEvents('control', $(this).find('input[type="text"],textarea'));
                        registerEvents('toggle', $(this).find('.dtToggle'));
                    });
                    ui.item.after(elems).remove();
                    selectSingle(elems.first());
                    selectRange(elems.last());
                    table.find('tr').hide().show(0);  // Redraw to fix borders
                    Ω.change();
                }
            });
        }

        var style = $([
            '<style type="text/css">',
            '    ' + containSelect + ' {',
            '        padding: 10px;',
            '    }',
            '    ' + containSelect + ':focus {',
            '        background-color: rgb(235, 235, 235);',
            '        outline: none;',
            '    }',
            '    ' + containSelect + ' > div {',
            '        overflow: hidden;',
            '    }',
            '    ' + containSelect + ' .dtSelected {',
            '        background-color: ' + highlightColor + ';',
            '    }',
            '    ' + containSelect + ' .dtSubSelect {',
            '        background-color: ' + highlightColor + ';',
            '    }',
            '    ' + containSelect + ' .dtDisableSelection {',
            '        -moz-user-select: none;',
            '        -ms-user-select: none;',
            '        -webkit-user-select: none;',
            '        user-select: none;',
            '    }',
            '    ' + containSelect + ' .dtTable {',
            '        position: relative;',
            '        border-collapse: collapse;',
            '        border: none;',
            '        width: 90%;',
            '        width: -moz-calc(100% - 200px);',
            '        width: -webkit-calc(100% - 200px);',
            '        width: calc(100% - 200px);',
            '        float: left;',
            '        background-color: white;',
            '    }',
            '    ' + containSelect + ' .dtTable td {',
            '        padding: 0;',
            '        border: 1px solid black;',
            '        width: ' + (100 / cols()) + '%;',
            '    }',
            '    ' + containSelect + ' .dtTable td > div {',
            '        position: relative;',
            '        height: 100%;',
            '        width: 100%;',
            '        margin: 0;',
            '        padding: 4px 20px;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '    }',
            '    ' + containSelect + ' .dtTable .dtToggle {',
            '        position: absolute;',
            '        top: 6px;',
            '        right: 5px;',
            '        border: 1px solid black;',
            '        height: 5px;',
            '        width: 5px;',
            '        cursor: pointer;',
            '        background-color: white;',
            '    }',
            '    ' + containSelect + ' .dtTable .dtToggle:hover {',
            '        background-color: rgb(220, 220, 220);',
            '    }',
            '    ' + containSelect + ' .dtTable input[type="text"] {',
            '        width: 100%;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '        -moz-user-select: text;',
            '        -ms-user-select: text;',
            '        -webkit-user-select: text;',
            '        user-select: text;',
            '    }',
            '    ' + containSelect + ' .dtTable textarea {',
            '        resize: none;',
            '        width: 100%;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '        -moz-user-select: text;',
            '        -ms-user-select: text;',
            '        -webkit-user-select: text;',
            '        user-select: text;',
            '    }',
            '    ' + containSelect + ' .dtControlWrapper {',
            '        width: 10%;',
            '        width: -moz-calc(200px);',
            '        width: -webkit-calc(200px);',
            '        width: calc(200px);',
            '        padding-left: 10px;',
            '        float: right;',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '    }',
            '    ' + containSelect + ' .dtControlPanel {',
            '        -moz-box-sizing: border-box;',
            '        -webkit-box-sizing: border-box;',
            '        box-sizing: border-box;',
            '    }',
            '    ' + containSelect + ' .dtControlPanel ul {',
            '        margin: 6px;',
            '        padding: 0;',
            '        text-align: center;',
            '    }',
            '    ' + containSelect + ' .dtControlPanel li {',
            '        list-style-type: none;',
            '        margin: 2px;',
            '        cursor: pointer;',
            '    }',
            '    ' + containSelect + ' .dtControlPanel li:hover {',
            '        background-color: rgba(0, 0, 0, 0.1);',
            '    }',
            '    ' + containSelect + ' .dtDisabled {',
            '        color: rgb(120, 120, 120);',
            '        cursor: default !important;',
            '    }',
            '    ' + containSelect + ' .dtDisabled:hover {',
            '        background-color: inherit !important;',
            '    }',
            '</style>'
        ].join('\r\n')).appendTo('head');

        return Ω;
    }

    //#endregion

}) (jQuery)
