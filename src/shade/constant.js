Shade.constant = function(v, type)
{
    var constant_tuple_fun = function(type, args)
    {
        function to_glsl(type, args) {
            return type + '(' + _.toArray(args).join(', ') + ')';
        }

        function matrix_row(i) {
            var sz = type.array_size();
            var result = [];
            for (var j=0; j<sz; ++j) {
                result.push(args[i + j*sz]);
            }
            return result;
        }

        return Shade._create_concrete_exp( {
            eval: function(glsl_name) {
                return to_glsl(this.type.repr(), args);
            },
            expression_type: "constant{" + args + "}",
            is_constant: function() { return true; },
            element: Shade.memoize_on_field("_element", function(i) {
                if (this.type.is_pod()) {
                    if (i === 0)
                        return this;
                    else
                        throw "float is an atomic type, got this: " + i;
                } if (this.type.is_vec()) {
                    return Shade.constant(args[i]);
                } else {
                    return Shade.vec.apply(matrix_row(i));
                }
            }),
            element_is_constant: function(i) {
                return true;
            },
            element_constant_value: Shade.memoize_on_field("_element_constant_value", function(i) {
                if (this.type.equals(Shade.Types.float_t)) {
                    if (i === 0)
                        return args[0];
                    else
                        throw "float is an atomic type";
                } if (this.type.is_vec()) {
                    return args[i];
                }
                return vec[this.type.array_size()].make(matrix_row(i));
            }),
            constant_value: Shade.memoize_on_field("_constant_value", function() {
                // FIXME boolean_vector
                if (this.type.is_pod())
                    return args[0];
                if (this.type.equals(Shade.Types.vec2) ||
                    this.type.equals(Shade.Types.vec3) ||
                    this.type.equals(Shade.Types.vec4))
                    return vec[args.length].make(args);
                if (this.type.equals(Shade.Types.mat2) ||
                    this.type.equals(Shade.Types.mat3) ||
                    this.type.equals(Shade.Types.mat4))
                    return mat[Math.sqrt(args.length)].make(args);
                else
                    throw "Internal Error: constant of unknown type";
            }),
            compile: function(ctx) {},
            parents: [],
            type: type
        });
    };

    var t = constant_type(v);
    if (t === 'other') {
        t = typeOf(v);
        if (t === 'array') {
            var new_v = v.map(Shade.make);
            var array_size = new_v.length;
            if (array_size == 0) {
                throw "array constant must be non-empty";
            }
            var array_type = Shade.array(new_v[0].type, array_size);
            return Shade._create_concrete_exp( {
                parents: new_v,
                type: array_type,
                expression_type: "constant",
                eval: function() { return this.glsl_name; },
                compile: function (ctx) {
                    this.array_initializer_glsl_name = ctx.request_fresh_glsl_name();
                    ctx.strings.push(this.type.declare(this.glsl_name), ";\n");
                    ctx.strings.push("void", this.array_initializer_glsl_name, "(void) {\n");
                    for (var i=0; i<this.parents.length; ++i) {
                        ctx.strings.push("    ", this.glsl_name, "[", i, "] =",
                                         this.parents[i].eval(), ";\n");
                    };
                    ctx.strings.push("}\n");
                    ctx.add_initialization(this.array_initializer_glsl_name + "()");
                },
                element: function(i) {
                    return this.parents[i];
                },
                element_is_constant: function(i) {
                    return this.parents[i].is_constant();
                },
                element_constant_value: function(i) {
                    return this.parents[i].constant_value();
                }
            });
        } else {
            throw "type error: constant should be bool, number, vector or matrix";
        }
    }
    if (t === 'number') {
        if (type && !(type.equals(Shade.Types.float_t) ||
                      type.equals(Shade.Types.int_t))) {
            throw ("expected specified type for numbers to be float or int," +
                   " got " + type.repr() + " instead.");
        }
        return constant_tuple_fun(type || Shade.Types.float_t, [v]);
    }
    if (t === 'boolean') {
        if (type && !type.equals(Shade.Types.bool_t))
            throw ("boolean constants cannot be interpreted as " + 
                   type.repr());
        return constant_tuple_fun(Shade.Types.bool_t, [v]);
    }
    if (t === 'vector') {
        var d = v.length;
        if (d < 2 && d > 4)
            throw "Invalid length for constant vector: " + v;

        var el_ts = _.map(v, function(t) { return typeOf(t); });
        if (!_.all(el_ts, function(t) { return t === el_ts[0]; })) {
            throw "Not all constant params have the same types;";
        }
        if (el_ts[0] === "number") {
            var computed_t = Shade.basic('vec' + d);
            if (type && !computed_t.equals(type)) {
                throw "passed constant must have type " + computed_t.repr()
                    + ", but was request to have incompatible type " 
                    + type.repr();
            }
            return constant_tuple_fun(computed_t, v);
        }
        else
            throw "bad datatype for constant: " + el_ts[0];
    }
    if (t === 'boolean_vector') {
        // FIXME bvecs
        var d = v.length;
        var computed_t = Shade.basic('bvec' + d);
        if (type && !computed_t.equals(type)) {
            throw "passed constant must have type " + computed_t.repr()
                + ", but was request to have incompatible type " 
                + type.repr();
        }
        return constant_tuple_fun(computed_t, v);
    }
    if (t === 'matrix') {
        var d = Math.sqrt(v.length); // FIXME UGLY
        var computed_t = Shade.basic('mat' + d);
        if (type && !computed_t.equals(type)) {
            throw "passed constant must have type " + computed_t.repr()
                + ", but was request to have incompatible type " 
                + type.repr();
        }
        return constant_tuple_fun(computed_t, v);
    }
    throw "type error: constant_type returned bogus value?";
};

Shade.as_int = function(v) { return Shade.make(v).as_int(); };
Shade.as_bool = function(v) { return Shade.make(v).as_bool(); };
Shade.as_float = function(v) { return Shade.make(v).as_float(); };