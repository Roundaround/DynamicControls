/// <reference path="Scripts/jquery-2.0.3.js" />
/// <reference path="Scripts/jquery-ui-1.10.3.js" />

/**
 *  DynamicControls v0.8.0
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

    function isArrayOfArrays(obj) {
        if (!isArray(obj)) return false;

        var flag = true;
        for (var i = 0; i < obj.length ; i++) {
            if (!isArray(obj[i])) return false;
        }

        return true;
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
        var Ω = $(this);
        if (Ω.css('display') !== 'block')
            throw new Error('Invalid container for dynamicList.');

        args = args || {};

        var i, j;

        var defaultData = args.defaultData || 'Enter Data Here.';
        var data = args.data || [].repeat(defaultData, 4);

        if (!isArray(data))
            throw new Error('Invalid data for dynamicList.');

        function rows() {
            return data.length;
        }

        Ω.contents().remove();
        var id = 0;
        $('[data-dcid]').each(function () {
            id = Math.max(parseInt($(this).attr('data-dcid')), id);
        });
        Ω.attr('data-dcid', ++id);
        var containSelect = '[data-dcid="' + id + '"]';

        var wrapper = $(document.createElement('div')).css({ height: '100%', width: '100%', margin: 0, padding: 0 }).appendTo(Ω);

        var list = $(document.createElement('ul')).addClass('dcList').appendTo(wrapper);

        for (i = 0; i < rows() ; i++) {
            var li = $(document.createElement('li')).appendTo(list);
            var liWrapper = $(document.createElement('div')).appendTo(li);

            var bullet = $(document.createElement('div')).addClass('dcBullet').text('•').appendTo(liWrapper);
            var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
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

        var controlWrapper = $(document.createElement('div')).addClass('dcControlWrapper').appendTo(wrapper);
        var controlPanel = $(document.createElement('div')).addClass('dcControlPanel').appendTo(controlWrapper);
        var controlList = $(document.createElement('ul')).appendTo(controlPanel);
        var control_select = $(document.createElement('li')).text('Select All').click(selectAll).appendTo(controlList);
        var control_deselect = $(document.createElement('li')).text('Deselect All').click(clearSelection).appendTo(controlList);
        var control_moveUp = $(document.createElement('li')).text('Move Up').click(function (e) {
            if (!$(this).hasClass('dcDisabled'))
                moveUp();
        }).appendTo(controlList);
        var control_moveDown = $(document.createElement('li')).text('Move Down').click(function (e) {
            if (!$(this).hasClass('dcDisabled'))
                moveDown();
        }).appendTo(controlList);
        var control_insertBefore = $(document.createElement('li')).text('Insert Before').click(function (e) {
            if (!$(this).hasClass('dcDisabled')) {
                insertBefore();
                focusInSelection();
            }
        }).appendTo(controlList);
        var control_insertAfter = $(document.createElement('li')).text('Insert After').click(function (e) {
            if (!$(this).hasClass('dcDisabled')) {
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
            control_insertBefore.addClass('dcDisabled');
            control_insertAfter.addClass('dcDisabled');
        }

        function enableControls() {
            control_insertBefore.removeClass('dcDisabled');
            control_insertAfter.removeClass('dcDisabled');
        }

        function isDisjoint() {
            return control_insertBefore.hasClass('dcDisabled');
        }

        Ω.selectSingle = selectSingle;
        function selectSingle(obj) {
            Ω.click();
            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            clearSelection();
            obj.addClass('dcSelected');

            enableControls();
        }

        Ω.selectRange = selectRange;
        function selectRange(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            if (obj.hasClass('dcSelected')) {
                clearSubSelect();
            } else if (list.find('.dcSelected').length != 1) {
                selectSingle(obj);
            } else {
                clearSubSelect();

                obj.addClass('dcSubSelect');
                var after = obj.nextAll('.dcSelected').length == 1;
                var rows = after ? obj.nextAll('li') : obj.prevAll('li');
                for (var i = 0; i < rows.length; i++) {
                    if (rows.eq(i).hasClass('dcSelected')) return;
                    rows.eq(i).addClass('dcSubSelect');
                }
            }

            enableControls();
        }

        Ω.selectDisjoint = selectDisjoint;
        function selectDisjoint(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'DIV')
                obj = obj.parent();

            if (list.find('.dcSelected,.dcSubSelect').length > 0) {
                disableControls();

                if (obj.is('.dcSelected,.dcSubSelect')) {
                    obj.removeClass('dcSelected').removeClass('dcSubSelect');
                } else {
                    obj.addClass('dcSubSelect');
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
            list.find('.dcSelected').removeClass('dcSelected');
            list.find('.dcSubSelect').removeClass('dcSubSelect');

            enableControls();
        }

        Ω.clearSubSelect = clearSubSelect;
        function clearSubSelect() {
            list.find('.dcSubSelect').removeClass('dcSubSelect');

            enableControls();
        }

        Ω.moveUp = moveUp;
        function moveUp() {
            if (list.find('.dcSelected,.dcSubSelect').length > 0 &&
                !list.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                list.find('.dcSelected,.dcSubSelect').each(function () {
                    $(this).insertBefore($(this).prev());
                });
                Ω.change();
            }
        }

        Ω.moveDown = moveDown;
        function moveDown() {
            if (list.find('.dcSelected,.dcSubSelect').length > 0 &&
                !list.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                $(list.find('.dcSelected,.dcSubSelect').get().reverse()).each(function () {
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

            var bullet = $(document.createElement('div')).addClass('dcBullet').text('•').appendTo(liWrapper);
            var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
            registerEvents('toggle', toggle);

            var input = $(document.createElement('input')).attr('type', 'text').appendTo(liWrapper);
            input.val(defaultData);
            input.attr('placeholder', defaultData);
            registerEvents('control', input);

            if (list.find('li').length == 0) {
                list.append(li);
            } else if (list.find('.dcSelected').length == 1) {
                if (list.find('.dcSubSelect').length > 0) {
                    list.find('.dcSelected,.dcSubSelect').last().after(li);
                } else {
                    list.find('.dcSelected').after(li);
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

            var bullet = $(document.createElement('div')).addClass('dcBullet').text('•').appendTo(liWrapper);
            var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(liWrapper);
            registerEvents('toggle', toggle);

            var input = $(document.createElement('input')).attr('type', 'text').appendTo(liWrapper);
            input.val(defaultData);
            input.attr('placeholder', defaultData);
            registerEvents('control', input);

            if (list.find('li').length == 0) {
                list.append(li);
            } else if (list.find('.dcSelected').length == 1) {
                if (list.find('.dcSubSelect').length > 0) {
                    list.find('.dcSelected,.dcSubSelect').first().before(li);
                } else {
                    list.find('.dcSelected').before(li);
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
            if (list.find('.dcSelected,.dcSubSelect').length > 0 && confirm('Are you sure you wish to delete the selected rows?')) {

                var height = Ω.height();

                list.find('.dcSelected,.dcSubSelect').remove();
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
            list.find('.dcSelected,.dcSubSelect').eq(row).find('input[type="text"],textarea').first().focusEnd();
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
                        if (!obj.closest('li').is('.dcSelected,.dcSubSelect'))
                            selectSingle(obj.closest('li'));
                        moveUp();
                        obj.focusEnd();
                    } else if (e.keyCode == 40 && e.ctrlKey) { // Ctrl + Down
                        e.preventDefault();
                        if (!obj.closest('li').is('.dcSelected,.dcSubSelect'))
                            selectSingle(obj.closest('li'));
                        moveDown();
                        obj.focusEnd();
                    } else if (e.keyCode == 38 && e.shiftKey) { // Shift + Up
                        e.preventDefault();
                        if (list.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                            if (!list.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                                selectRange(list.find('.dcSelected,.dcSubSelect').first().prev());
                            }
                        } else {
                            selectRange(list.find('.dcSelected,.dcSubSelect').last().prev());
                        }
                        obj.focusEnd();
                    } else if (e.keyCode == 40 && e.shiftKey) { // Shift + Down
                        e.preventDefault();
                        if (list.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                            if (!list.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                                selectRange(list.find('.dcSelected,.dcSubSelect').last().next());
                            }
                        } else {
                            selectRange(list.find('.dcSelected,.dcSubSelect').first().next());
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
                obj.focus(function (e, b) {
                    if (!b) {
                        alert('No event.');
                        Ω.focus();
                        var bg = Ω.css('background');
                        obj.trigger('focus', true);
                        Ω.css('background', bg);
                    }
                });
                obj.blur(function (e) {
                    Ω.css('background', '');
                });
                obj.change(function (e) {
                    Ω.change(e);
                });
            } else if (type == 'row') {
                obj.click(function (e) {
                    e.stopPropagation();
                    Ω.parents().each(function () {
                        $(this).attr('data-dcScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dcScroll')).attr('data-dcScroll', '');
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
                        $(this).attr('data-dcScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dcScroll')).attr('data-dcScroll', '');
                    });
                    toggleInput(this);
                });
            }
        }

        Ω.click(function (e) {
            clearSelection();
        });

        Ω.find('.dcControlWrapper').click(function (e) {
            e.stopPropagation();
        });

        Ω.attr('tabindex', 1);

        Ω.keydown(function (e) {
            if (e.keyCode == 27) { // Escape
                e.preventDefault();
                clearSelection();
            } else if (e.keyCode == 78) { // N
                e.preventDefault();
                if (!isDisjoint())
                    insertAfter();
            } else if (list.find('.dcSelected,.dcSubSelect').length > 0) {
                if (e.keyCode == 69) { // E
                    e.preventDefault();
                    focusInSelection();
                } else if (e.keyCode == 84) { // A
                    if (e.altKey) {
                        e.preventDefault();
                        list.find('.dcSelected,.dcSubSelect').each(function () {
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
                        if (list.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                            if (!list.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                                selectRange(list.find('.dcSelected,.dcSubSelect').first().prev());
                            }
                        } else {
                            selectRange(list.find('.dcSelected,.dcSubSelect').last().prev());
                        }
                    } else {
                        clearSubSelect();
                        if (list.find('.dcSelected').is(':first-child')) {
                            selectSingle(list.find('li:last-child'));
                        } else {
                            selectSingle(list.find('.dcSelected').prev());
                        }
                    }
                } else if (e.keyCode == 40) { // Down Arrow
                    if (e.ctrlKey) {
                        moveDown();
                    } else if (e.shiftKey) {
                        e.preventDefault();
                        if (list.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                            if (!list.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                                selectRange(list.find('.dcSelected,.dcSubSelect').last().next());
                            }
                        } else {
                            selectRange(list.find('.dcSelected,.dcSubSelect').first().next());
                        }
                    } else {
                        clearSubSelect();
                        if (list.find('.dcSelected').is(':last-child')) {
                            selectSingle(list.find('li:first-child'));
                        } else {
                            selectSingle(list.find('.dcSelected').next());
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
                    if (!item.is('.dcSelected,.dcSubSelect')) {
                        selectSingle(item);
                    }

                    var elems = list.find('.dcSelected,.dcSubSelect').clone();
                    item.data('multidrag', elems).siblings('.dcSelected,.dcSubSelect').remove();
                    var helper = $('<li />');
                    return helper.append(elems);
                },
                stop: function (e, ui) {
                    var elems = ui.item.data('multidrag');
                    elems.each(function () {
                        registerEvents('row', this);
                        registerEvents('control', $(this).find('input[type="text"],textarea'));
                        registerEvents('toggle', $(this).find('.dcToggle'));
                    });
                    ui.item.after(elems).remove();
                    selectSingle(elems.first());
                    selectRange(elems.last());
                    Ω.change();
                }
            });
        }

        return Ω;
    }

    //#endregion

    //#region DynamicTable

    $.fn.dynamicTable = function (args) {
        var Ω = $(this);
        if (Ω.css('display') !== 'block')
            throw new Error('Invalid container for dynamicTable.');

        args = args || {};

        var i, j;

        var defaultData = args.defaultData || 'Enter Data Here.';
        var data = args.data || [].repeat([].repeat(defaultData, 2), 2);

        function isArray(obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
        }

        if (!isArrayOfArrays(data))
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
        31
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
        $('[data-dcid]').each(function () {
            id = Math.max(parseInt($(this).attr('data-dcid')), id);
        });
        Ω.attr('data-dcid', ++id);
        var containSelect = '[data-dcid="' + id + '"]';

        var wrapper = $(document.createElement('div')).css({ height: '100%', width: '100%', margin: 0, padding: 0 }).appendTo(Ω);
        var table = $(document.createElement('table')).addClass('dcTable').appendTo(wrapper);

        for (i = 0; i < rows() ; i++) {
            var tr = $(document.createElement('tr')).appendTo(table);

            for (j = 0; j < cols() ; j++) {
                var td = $(document.createElement('td')).appendTo(tr);
                var tdWrapper = $(document.createElement('div')).appendTo(td);
                var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
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

        var controlWrapper = $(document.createElement('div')).addClass('dcControlWrapper').appendTo(wrapper);
        var controlPanel = $(document.createElement('div')).addClass('dcControlPanel').appendTo(controlWrapper);
        var controlList = $(document.createElement('ul')).appendTo(controlPanel);
        var control_select = $(document.createElement('li')).text('Select All').click(selectAll).appendTo(controlList);
        var control_deselect = $(document.createElement('li')).text('Deselect All').click(clearSelection).appendTo(controlList);
        var control_moveUp = $(document.createElement('li')).text('Move Up').click(function (e) {
            if (!$(this).hasClass('dcDisabled'))
                moveUp();
        }).appendTo(controlList);
        var control_moveDown = $(document.createElement('li')).text('Move Down').click(function (e) {
            if (!$(this).hasClass('dcDisabled'))
                moveDown();
        }).appendTo(controlList);
        var control_insertBefore = $(document.createElement('li')).text('Insert Before').click(function (e) {
            if (!$(this).hasClass('dcDisabled')) {
                insertBefore();
                focusInSelection();
            }
        }).appendTo(controlList);
        var control_insertAfter = $(document.createElement('li')).text('Insert After').click(function (e) {
            if (!$(this).hasClass('dcDisabled')) {
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
            control_insertBefore.addClass('dcDisabled');
            control_insertAfter.addClass('dcDisabled');
        }

        function enableControls() {
            control_insertBefore.removeClass('dcDisabled');
            control_insertAfter.removeClass('dcDisabled');
        }

        function isDisjoint() {
            return control_insertBefore.hasClass('dcDisabled');
        }

        Ω.selectSingle = selectSingle;
        function selectSingle(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            clearSelection();
            obj.addClass('dcSelected');

            enableControls();
        }

        Ω.selectRange = selectRange;
        function selectRange(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (obj.hasClass('dcSelected')) {
                clearSubSelect();
            } else if (table.find('.dcSelected').length != 1) {
                selectSingle(obj);
            } else {
                clearSubSelect();

                obj.addClass('dcSubSelect');
                var after = obj.nextAll('.dcSelected').length == 1;
                var rows = after ? obj.nextAll('tr') : obj.prevAll('tr');
                for (var i = 0; i < rows.length; i++) {
                    if (rows.eq(i).hasClass('dcSelected')) return;
                    rows.eq(i).addClass('dcSubSelect');
                }
            }

            enableControls();
        }

        Ω.selectDisjoint = selectDisjoint;
        function selectDisjoint(obj) {
            obj = $(obj);
            if (obj.prop('tagName') == 'TD')
                obj = obj.parent();

            if (table.find('.dcSelected,.dcSubSelect').length > 0) {
                disableControls();

                if (obj.is('.dcSelected,.dcSubSelect')) {
                    obj.removeClass('dcSelected').removeClass('dcSubSelect');
                } else {
                    obj.addClass('dcSubSelect');
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
            table.find('.dcSelected').removeClass('dcSelected');
            table.find('.dcSubSelect').removeClass('dcSubSelect');

            enableControls();
        }

        Ω.clearSubSelect = clearSubSelect;
        function clearSubSelect() {
            table.find('.dcSubSelect').removeClass('dcSubSelect');

            enableControls();
        }

        Ω.moveUp = moveUp;
        function moveUp() {
            if (table.find('.dcSelected,.dcSubSelect').length > 0 &&
                !table.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                table.find('.dcSelected,.dcSubSelect').each(function () {
                    $(this).insertBefore($(this).prev());
                });
                Ω.change();
            }
        }

        Ω.moveDown = moveDown;
        function moveDown() {
            if (table.find('.dcSelected,.dcSubSelect').length > 0 &&
                !table.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                $(table.find('.dcSelected,.dcSubSelect').get().reverse()).each(function () {
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
                var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                registerEvents('toggle', toggle);

                var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                input.val(defaultData);
                input.attr('placeholder', defaultData);
                registerEvents('control', input);
            }

            if (table.find('tr').length == 0) {
                table.append(tr);
            } else if (table.find('.dcSelected').length == 1) {
                if (table.find('.dcSubSelect').length > 0) {
                    table.find('.dcSelected,.dcSubSelect').last().after(tr);
                } else {
                    table.find('.dcSelected').after(tr);
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
                var toggle = $(document.createElement('div')).addClass('dcToggle').attr('title', 'Click here to toggle input box size.').appendTo(tdWrapper);
                registerEvents('toggle', toggle);

                var input = $(document.createElement('input')).attr('type', 'text').appendTo(tdWrapper);
                input.val(defaultData);
                input.attr('placeholder', defaultData);
                registerEvents('control', input);
            }

            if (table.find('tr').length == 0) {
                table.append(tr);
            } else if (table.find('.dcSelected').length == 1) {
                if (table.find('.dcSubSelect').length > 0) {
                    table.find('.dcSelected,.dcSubSelect').first().before(tr);
                } else {
                    table.find('.dcSelected').before(tr);
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
            if (table.find('.dcSelected,.dcSubSelect').length > 0) {
                if (confirm('Are you sure you wish to delete the selected rows?')) {
                    table.find('.dcSelected,.dcSubSelect').remove();
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
            table.find('.dcSelected,.dcSubSelect').eq(row).find('input[type="text"],textarea').eq(item).focusEnd();
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
                        if (!obj.closest('tr').is('.dcSelected,.dcSubSelect'))
                            selectSingle(obj.closest('tr'));
                        moveUp();
                        obj.focusEnd();
                    } else if (e.keyCode == 40 && e.ctrlKey) { // Ctrl + Down
                        e.preventDefault();
                        if (!obj.closest('tr').is('.dcSelected,.dcSubSelect'))
                            selectSingle(obj.closest('tr'));
                        moveDown();
                        obj.focusEnd();
                    } else if (e.keyCode == 38 && e.shiftKey) { // Shift + Up
                        e.preventDefault();
                        if (table.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                            if (!table.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                                selectRange(table.find('.dcSelected,.dcSubSelect').first().prev());
                            }
                        } else {
                            selectRange(table.find('.dcSelected,.dcSubSelect').last().prev());
                        }
                    } else if (e.keyCode == 40 && e.shiftKey) { // Shift + Down
                        e.preventDefault();
                        if (table.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                            if (!table.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                                selectRange(table.find('.dcSelected,.dcSubSelect').last().next());
                            }
                        } else {
                            selectRange(table.find('.dcSelected,.dcSubSelect').first().next());
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
                    // TODO: Set bg color for Ω here.
                });
                obj.blur(function (e) {
                    Ω.css('background', '');
                });
                obj.change(function (e) {
                    Ω.change(e);
                });
            } else if (type == 'row') {
                obj.click(function (e) {
                    e.stopPropagation();
                    Ω.parents().each(function () {
                        $(this).attr('data-dcScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dcScroll')).attr('data-dcScroll', '');
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
                        $(this).attr('data-dcScroll', $(this).scrollTop());
                    });
                    Ω.focus();
                    Ω.parents().each(function () {
                        $(this).scrollTop($(this).attr('data-dcScroll')).attr('data-dcScroll', '');
                    });
                    toggleInput(this);
                });
            }
        }

        Ω.click(function (e) {
            clearSelection();
        });

        Ω.find('.dcControlWrapper').click(function (e) {
            e.stopPropagation();
        });

        Ω.attr('tabindex', 1);

        Ω.keydown(function (e) {
            if (e.keyCode == 27) { // Escape
                e.preventDefault();
                clearSelection();
            } else if (e.keyCode == 78) { // N
                e.preventDefault();
                if (!isDisjoint())
                    insertAfter();
            } else if (table.find('.dcSelected,.dcSubSelect').length > 0) {
                if (e.keyCode == 69) { // E
                    e.preventDefault();
                    focusInSelection();
                } else if (e.keyCode == 84) { // T
                    if (e.altKey) {
                        e.preventDefault();
                        table.find('.dcSelected > td,.dcSubSelect > td').each(function () {
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
                        if (table.find('.dcSelected,.dcSubSelect').last().is('.dcSelected')) {
                            if (!table.find('.dcSelected,.dcSubSelect').is(':first-child')) {
                                selectRange(table.find('.dcSelected,.dcSubSelect').first().prev());
                            }
                        } else {
                            selectRange(table.find('.dcSelected,.dcSubSelect').last().prev());
                        }
                    } else {
                        clearSubSelect();
                        if (table.find('.dcSelected').is(':first-child')) {
                            selectSingle(table.find('tr:last-child'));
                        } else {
                            selectSingle(table.find('.dcSelected').prev());
                        }
                    }
                } else if (e.keyCode == 40) { // Down Arrow
                    if (e.ctrlKey) {
                        moveDown();
                    } else if (e.shiftKey) {
                        e.preventDefault();
                        if (table.find('.dcSelected,.dcSubSelect').first().is('.dcSelected')) {
                            if (!table.find('.dcSelected,.dcSubSelect').is(':last-child')) {
                                selectRange(table.find('.dcSelected,.dcSubSelect').last().next());
                            }
                        } else {
                            selectRange(table.find('.dcSelected,.dcSubSelect').first().next());
                        }
                    } else {
                        clearSubSelect();
                        if (table.find('.dcSelected').is(':last-child')) {
                            selectSingle(table.find('tr:first-child'));
                        } else {
                            selectSingle(table.find('.dcSelected').next());
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

                    if (!item.is('.dcSelected,.dcSubSelect')) {
                        selectSingle(item);
                    }

                    var elems = table.find('.dcSelected,.dcSubSelect').clone();
                    item.data('multidrag', elems).siblings('.dcSelected,.dcSubSelect').remove();
                    var helper = $('<tr />');
                    return helper.append(elems);
                },
                stop: function (e, ui) {
                    var elems = ui.item.data('multidrag');
                    elems.each(function () {
                        registerEvents('row', this);
                        registerEvents('control', $(this).find('input[type="text"],textarea'));
                        registerEvents('toggle', $(this).find('.dcToggle'));
                    });
                    ui.item.after(elems).remove();
                    selectSingle(elems.first());
                    selectRange(elems.last());
                    table.find('tr').hide().show(0);  // Redraw to fix borders
                    Ω.change();
                }
            });
        }

        return Ω;
    }

    //#endregion

}) (jQuery)
