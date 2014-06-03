/*!
 * FillOutForm json creator
 * Author: Vlad Shlosberg
 * Source Url: https://github.com/vshlos/fillOutForm
 * */

window.vvc.createClass([], "FillOutForm", "fillOutForm", {
    init: function (target, options) {
        //$("#afd").fillOutForm({
        //  setHandlers: {
        //      "field.name": function () { return blah; }
        //  },
        //  data: object
        //})
        this.target = $(target)



        if (options) {
            this.setOptions(options)
        } else {
            this.setHandlers = {};
            this.getHandlers = {};
            this.fieldName = "field"
        }


        //remember the starting form
        this.original = this.getForm();

    },
    setOptions: function (options) {
        this.setHandlers = options.setHandlers || this.setHandlers || {};
        this.getHandlers = options.getHandlers || this.getHandlers || {};
        this.validHandler = options.validHandler || this.validHandler;
        this.invalidHandler = options.invalidHandler || this.invalidHandler;

        this.fieldName = options.field || this.fieldName || "field"



        this.attr = options.attr;
        if (options.data) {
            this.data = options.data;
            this.fillOut();
        }

    },
    setForm: function (data) {
        this.data = data;
        this.fillOut();
    },
    getAttr: function (item, tag, fieldName) {
        var attr = item.data(fieldName + "-attr") || this.attr
        if (attr) {
            return attr;
        }

        if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "HIDDEN") {
            return "val"
        }
        return "text"
    },
    setField: function (item, value) {
        var that = this
        var domItem = item.get(0)
        var tag = domItem.tagName
        var type = (domItem.type || "text").toLowerCase();

        var attr = that.getAttr(item, tag, this.fieldName)

        var fieldType = item.data(that.fieldName + "-type");
        var template = item.data(that.fieldName + "-template");


        if (value instanceof Array && (fieldType === "section" || fieldType === "table")) {
            if (template && template.match(/^[^\<]*$/)) {
                template = $(template).html()
            } else if (!template && fieldType === "table") {
                template = $("<tr />")
                var prefix = "data-" + this.fieldName
                item.find('thead th[' + prefix + ']').each(function () {
                    var el = $(this)
                    var attrs = this.attributes;
                    var td = $("<td />").appendTo(template)
                    for (var i = 0, len = attrs.length; i < len; i++) {
                        var attr = attrs[i]
                        var rowAttrs = []
                        if (attr.name.substr(0, prefix.length) == prefix) {
                            td.attr(attr.name, attr.value)      
                        }
                    }
                })  
                template = template.get(0).outerHTML
            }
            var container = fieldType === "section" ? item : item.find("tbody");

            container.html("")
            value.forEach(function (val) {
                var tmp = $(template)
                that.fillOut(tmp, val)
                container.append(tmp)
            })

            return;
        }



        if (template) {
            value = template.replace(/{VALUE}/g, value);
        }

        attr = attr.split(",");

        attr.forEach(function(attrName) {

            var txtVal = value;
            if (value instanceof Array){
                txtVal = value.join(", ");
            } else if (value instanceof Object) {
                txtVal = JSON.stringify(value)
            }
            if (attrName === "val") {
                if (tag === "SELECT") {
                    if (!(value instanceof Array)) {
                        value = [txtVal]
                    }
                    item.children(":selected").removeAttr("selected");
                    value.forEach(function (val) {
                        item.children('[value="' + val + '"]').attr("selected", "selected");    
                    })

                } else if (tag === "INPUT" || tag === "HIDDEN") {
                    if (type === "text" || type === "password" || tag === "HIDDEN") {
                        item.val(txtVal)
                    } else if (type === "checkbox" || type === "radio") {
                        if (value === true || value.toLowerCase() === "true") {
                            item.attr("checked", "checked")
                        } else {
                            item.removeAttr("checked")
                        }
                    }
                }

            } else if (attrName === "text") {
                item[attrName](txtVal)  
            }
            else {
                item.attr(attrName, txtVal) 
            }

        })
        item.trigger("fillOutFormSetField")

    },
    fillOut: function (target, data) {

        var that = this;
        var handlers = this.setHandlers;
        data = data || this.data;
        target = target || this.target


        //first clear the form in case we dont set some data.
        this.clearForm(target);

        this.getQuery(target, this.fieldName).each(function (){
            var item = $(this)

            var field = item.data(that.fieldName);

            if (field === "" || field === null) {
                return;
            }

            var fieldParts = field.split(".")


            var value = data;

            for (var i = 0, len = fieldParts.length; value != null && i < len; i++) {
                var fieldName = fieldParts[i];
                var indexMatch = fieldName.match(/\[(\d*)\]$/i)
                if (indexMatch) {
                    fieldName = fieldName.replace("[" + indexMatch[1] + "]", "")
                }
                value = value[fieldName]
                if (indexMatch && value) {
                    var index = parseInt(indexMatch[1]);
                    value = value[index]
                }
            }
            if (value == null){
                return;
            }

            if (handlers[field]) {
                handlers[field](item, value);
            }
            else {
                that.setField(item, value); 
            }   

        })

        //remember the starting form
        this.original = this.getForm();

    },
    convertType: function (type, input) {

        switch(type) {
            case "number":
            case "integer":
            case "int":
                if (input === "") {
                    return null;
                }
                return parseInt(input);
            case "float":
                if (input === "") {
                    return null;
                }
                return parseFloat(input);
            case "boolean":

                return input.toLowerCase() === "true";
            case "date":
            case "datetime":
            case "time":
                if (input === "") {
                    return null;
                }
                return new Date(input).toISOString()
        }

        return input;
    },

    validate: function () {

        var that = this;

        var handlers = this.getHandlers;
        var valid = true;
        var validHandler = this.validHandler;
        var invalidHandler = this.invalidHandler;
        this.target.find("[data-" + this.fieldName + "]").each(function () {
            var item = $(this)
            var field = item.data(that.fieldName)
            var attr = item.data(that.fieldName + "-attr") || that.attr || "val"

            var required = item.data(that.fieldName + "-required")
            var max = item.data(that.fieldName + "-max")
            var min = item.data(that.fieldName + "-min")

            var dataType = item.data(that.fieldName + "-type")

            if (handlers[field]) {
                return;
            }
            else {

                item.inputValidator({
                    type: dataType,
                    max: max,
                    min: min,
                    allowNull: !required,
                    attr: attr
                })
                var inputValid = item.inputValidator("validate")
                if (inputValid && validHandler) {
                    validHandler(item)
                } else if (!inputValid) {
                    valid = false;
                    if (invalidHandler) {
                        invalidHandler(item)    
                    }

                }
            }



        });

        return valid;

    },
    getQuery: function (target, fieldName) {
        var tables = target.find("[data-" + fieldName + "-type='table'] [data-" + fieldName + "]");
        var sections = target.find("[data-" + fieldName + "-type='section'] [data-" + fieldName + "]");
        return target.find("[data-" + fieldName + "]").not(tables).not(sections)
    },
    /**
     * Gets a form by reading the dom and creating a java object from it
     * @param  {JQueryObject}   target    (Optional) The root object to search
     * @param  {String}         fieldName (Optional) The name of the field to search
     * @param  {Object}         form      (Optional) The starting object to modify
     * @return {Object}     The object with filled oiut data
     */
    getForm: function (target, fieldName, form) {
        var that = this;
        var handlers = this.getHandlers;
        form = form || {}
        fieldName = fieldName || this.fieldName
        var query = "[data-" + fieldName + "]";

        target = target || this.target
        this.getQuery(target, fieldName).each(function () {
            var item = $(this)
            var tag = this.tagName;
            var type = this.type;
            var field = item.data(fieldName)

            if (field === "" || field === null) {
                return;
            }

            var fieldParts = field.split(".")
            var attr = that.getAttr(item, tag, fieldName)
            var value = form;

            var dataType = item.data(fieldName + "-type")


            if (!dataType && (type === "checkbox" || type === "radio")) {
                dataType = "boolean";
            }


            var val = null;


            if (handlers[field]) {
                val = handlers[field](item);
            }
            else {

                if (attr){
                    if (dataType === "section" || dataType === "table") {
                        val = [];
                        var rows = dataType === "section" ? item.children() : item.find("tbody").children()
                        rows.each(function () {
                            var el = $(this);
                            val.push(that.getForm(el))
                        })

                    } else if (attr === "text" || attr === "val") {
                        var tag = item.get(0).tagName;
                        if (tag === "SELECT") {
                            if (item.attr("multiple")) {
                                var childValues = []
                                item.children(":selected:not([data-schema-field-ignore])").each(function () {
                                    var val = $(this)[attr]()
                                    if (val) {
                                        childValues.push(val)   
                                    }

                                })
                                val = childValues;
                            } else {
                                val = item.children(":selected:first")[attr]()
                            }


                        } else {
                            val = item[attr]()  
                        }

                    }
                    else{
                        val = item.attr(attr)
                    }
                }
            }


            if (dataType) {
                val = that.convertType(dataType, val);
            }


            for (var i = 0, len = fieldParts.length ; i < len; i++) {
                var fieldPart = fieldParts[i]
                var isLast = i == len - 1;


                var indexMatch = fieldPart.match(/\[(\d*)\]$/i)
                if (indexMatch) {
                    fieldPart = fieldPart.replace("[" + indexMatch[1] + "]", "")

                    var index = parseInt(indexMatch[1]);
                    value[fieldPart] = value[fieldPart] || [];
                    value[fieldPart][index] = isLast ? val : (value[fieldPart][index] || {})
                    value = value[fieldPart][index];

                } else {
                    value[fieldPart] = isLast ? val : (value[fieldPart] || {}); 
                    value = value[fieldPart]
                }

            }




        })

        return form;
    },
    clearForm: function (target) {

        var that = this;
        var handlers = this.setHandlers;

        target = target || this.target
        target.find("[data-" + this.fieldName + "]").each(function () {
            var item = $(this)
            var field = item.data(that.fieldName)
            var attr = item.data(that.fieldName + "-attr") || that.attr || "val"


            var val = null;

            if (handlers[field]) {
                return;
            }
            else {

                if (attr == "val"){
                    var tag = item.get(0).tagName;
                    if (tag == "SELECT") {
                        item.children(":selected").removeAttr("selected");
                        item.children(":first-child").attr("selected", "selected")
                    } else {
                        item.val("")
                    }   
                } else if (attr == "text") {
                    item.text("")
                } else {
                    item.attr(attr, "")
                }

            }

            if (that.validHandler){
                that.validHandler(item) 
            }



        });
    },
    resetForm: function () {
        if (this.original) {
            this.clearForm();
            this.setForm(this.original) 
        }

    },
    getDiff: function () {
        var current = this.getForm();
        return deployer.diffJson(this.original, current)
    },
    applyDiff: function (diff) {
        var that = this;
        diff.forEach(function (row) {
            that.target.find("[data-" + that.fieldName + "='" + row.key + "']").each(function (){
                that.setField($(this), row.value)
            });
        })

    }
})