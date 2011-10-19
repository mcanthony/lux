Shade.Optimizer = {};

Shade.Optimizer.transform_expression = function(operations)
{
    return function(v) {
        for (var i=0; i<operations.length; ++i) {
            var test = operations[i][0];
            var fun = operations[i][1];
            if (operations[i][2]) {
                var old_guid;
                do {
                    old_guid = v.guid;
                    v = v.replace_if(test, fun);
                } while (v.guid !== old_guid);
            } else
                v = v.replace_if(test, fun);
        }
        return v;
    };
};

Shade.Optimizer.is_constant = function(exp)
{
    return exp.is_constant();
};

Shade.Optimizer.replace_with_constant = function(exp)
{
    var v = exp.constant_value();
    var result = Shade.constant(v);
    return result;
};

Shade.Optimizer.is_zero = function(exp)
{
    if (!exp.is_constant())
        return false;
    var v = exp.constant_value();
    var t = constant_type(v);
    if (t === 'number')
        return v === 0;
    if (t === 'vector')
        return _.all(v, function (x) { return x === 0; });
    if (typeof(v) === 'matrix')
        return _.all(v, function (x) { return x === 0; });
    return false;
};

Shade.Optimizer.is_mul_identity = function(exp)
{
    if (!exp.is_constant())
        return false;
    var v = exp.constant_value();
    var t = constant_type(v);
    if (t === 'number')
        return v === 1;
    if (t === 'vector') {
        switch (v.length) {
        case 2: return vec.equal(v, vec.make([1,1]));
        case 3: return vec.equal(v, vec.make([1,1,1]));
        case 4: return vec.equal(v, vec.make([1,1,1,1]));
        default:
            throw "Bad vec length: " + v.length;    
        }
    }
    if (t === 'matrix')
        return mat.equal(v, mat[Math.sqrt(v.length)].identity());
    return false;
};

Shade.Optimizer.is_times_zero = function(exp)
{
    return exp.expression_type === 'operator*' &&
        (Shade.Optimizer.is_zero(exp.parents[0]) ||
         Shade.Optimizer.is_zero(exp.parents[1]));
};

Shade.Optimizer.is_plus_zero = function(exp)
{
    return exp.expression_type === 'operator+' &&
        (Shade.Optimizer.is_zero(exp.parents[0]) ||
         Shade.Optimizer.is_zero(exp.parents[1]));
};

Shade.Optimizer.replace_with_nonzero = function(exp)
{
    if (Shade.Optimizer.is_zero(exp.parents[0]))
        return exp.parents[1];
    if (Shade.Optimizer.is_zero(exp.parents[1]))
        return exp.parents[0];
    throw "no zero value on input to replace_with_nonzero?!";
};


Shade.Optimizer.is_times_one = function(exp)
{
    if (exp.expression_type !== 'operator*')
        return false;
    var t1 = exp.parents[0].type, t2 = exp.parents[1].type;
    var ft = Shade.Types.float_t;
    if (t1.equals(t2)) {
        return (Shade.Optimizer.is_mul_identity(exp.parents[0]) ||
                Shade.Optimizer.is_mul_identity(exp.parents[1]));
    } else if (!t1.equals(ft) && t2.equals(ft)) {
        return Shade.Optimizer.is_mul_identity(exp.parents[1]);
    } else if (t1.equals(ft) && !t2.equals(ft)) {
        return Shade.Optimizer.is_mul_identity(exp.parents[0]);
    } else if (t1.is_vec() && t2.is_mat()) {
        return Shade.Optimizer.is_mul_identity(exp.parents[1]);
    } else if (t1.is_mat() && t2.is_vec()) {
        return Shade.Optimizer.is_mul_identity(exp.parents[0]);
    } else {
        throw "Internal error, never should have gotten here";
    }
};

Shade.Optimizer.replace_with_notone = function(exp)
{
    var t1 = exp.parents[0].type, t2 = exp.parents[1].type;
    var ft = Shade.Types.float_t;
    if (t1.equals(t2)) {
        if (Shade.Optimizer.is_mul_identity(exp.parents[0])) {
            return exp.parents[1];
        } else if (Shade.Optimizer.is_mul_identity(exp.parents[1])) {
            return exp.parents[0];
        } else {
            throw "Intenal error, never should have gotten here";
        }
    } else if (!t1.equals(ft) && t2.equals(ft)) {
        return exp.parents[0];
    } else if (t1.equals(ft) && !t2.equals(ft)) {
        return exp.parents[1];
    }
    throw "no is_mul_identity value on input to replace_with_notone?!";
};

Shade.Optimizer.replace_with_zero = function(x)
{
    if (x.type.equals(Shade.Types.float_t))
        return Shade.constant(0);
    if (x.type.equals(Shade.Types.int_t))
        return Shade.as_int(0);
    if (x.type.equals(Shade.Types.vec2))
        return Shade.constant(vec2.create());
    if (x.type.equals(Shade.Types.vec3))
        return Shade.constant(vec3.create());
    if (x.type.equals(Shade.Types.vec4))
        return Shade.constant(vec4.create());
    if (x.type.equals(Shade.Types.mat2))
        return Shade.constant(mat2.create());
    if (x.type.equals(Shade.Types.mat3))
        return Shade.constant(mat3.create());
    if (x.type.equals(Shade.Types.mat4))
        return Shade.constant(mat4.create());
    throw "not a type replaceable with zero!?";
};

Shade.Optimizer.vec_at_constant_index = function(exp)
{
    if (exp.expression_type !== "index")
        return false;
    if (!exp.parents[1].is_constant())
        return false;
    var v = exp.parents[1].constant_value();
    if (typeOf(v) !== "number")
        return false;
    var t = exp.parents[0].type;
    if (t.equals(Shade.Types.vec2) && (v >= 0) && (v <= 1))
        return true;
    if (t.equals(Shade.Types.vec3) && (v >= 0) && (v <= 2))
        return true;
    if (t.equals(Shade.Types.vec4) && (v >= 0) && (v <= 3))
        return true;
    return false;
};

Shade.Optimizer.replace_vec_at_constant_with_swizzle = function(exp)
{
    var v = exp.parents[1].constant_value();
    if (v == 0) return exp.parents[0].swizzle("x");
    if (v == 1) return exp.parents[0].swizzle("y");
    if (v == 2) return exp.parents[0].swizzle("z");
    if (v == 3) return exp.parents[0].swizzle("w");
    throw "Internal error, shouldn't get here";
};

Shade.program = function(program_obj)
{
    var vp_obj = {}, fp_obj = {};

    // We provide saner names for program targets so users don't
    // need to memorize gl_FragColor, gl_Position and gl_PointSize.
    //
    // However, these names should still work, in case the users
    // want to have GLSL-familiar names.
    _.each(program_obj, function(v, k) {
        if (k === 'color' || k === 'gl_FragColor') {
            fp_obj['gl_FragColor'] = Shade.make(v);
        } else if (k === 'position') {
            vp_obj['gl_Position'] = Shade.make(v);
        } else if (k === 'point_size') {
            vp_obj['gl_PointSize'] = Shade.make(v);
        } else
            vp_obj[k] = Shade.make(v);
    });

    var vp_compile = Shade.CompilationContext(Shade.VERTEX_PROGRAM_COMPILE),
        fp_compile = Shade.CompilationContext(Shade.FRAGMENT_PROGRAM_COMPILE);

    var vp_exprs = [], fp_exprs = [];

    function is_attribute(x) {
        return x.expression_type === 'attribute';
    }
    function is_varying(x) {
        return x.expression_type === 'varying';
    }
    function is_per_vertex(x) {
        return x.stage === 'vertex';
    }
    var varying_names = [];
    function hoist_to_varying(exp) {
        var varying_name = Shade.unique_name();
        vp_obj[varying_name] = exp;
        varying_names.push(varying_name);
        return Shade.varying(varying_name, exp.type);
    };

    // explicit per-vertex hoisting must happen before is_attribute hoisting,
    // otherwise we might end up reading from a varying in the vertex program,
    // which is undefined behavior
    var fp_optimize = Shade.Optimizer.transform_expression([
        [is_per_vertex, hoist_to_varying],
        [is_attribute, hoist_to_varying],
        [Shade.Optimizer.is_times_zero, Shade.Optimizer.replace_with_zero, 
         true],
        [Shade.Optimizer.is_times_one, Shade.Optimizer.replace_with_notone, 
         true],
        [Shade.Optimizer.is_plus_zero, Shade.Optimizer.replace_with_nonzero,
         true],
        [Shade.Optimizer.vec_at_constant_index, 
         Shade.Optimizer.replace_vec_at_constant_with_swizzle, false],
        [Shade.Optimizer.is_constant,
         Shade.Optimizer.replace_with_constant]
    ]);

    var vp_optimize = Shade.Optimizer.transform_expression([
        [Shade.Optimizer.is_times_zero, Shade.Optimizer.replace_with_zero, 
         true],
        [Shade.Optimizer.is_times_one, Shade.Optimizer.replace_with_notone, 
         true],
        [Shade.Optimizer.is_plus_zero, Shade.Optimizer.replace_with_nonzero,
         true],
        [Shade.Optimizer.vec_at_constant_index, 
         Shade.Optimizer.replace_vec_at_constant_with_swizzle, false],
        [Shade.Optimizer.is_constant,
         Shade.Optimizer.replace_with_constant]
    ]);

    var used_varying_names = [];
    _.each(fp_obj, function(v, k) {
        v = fp_optimize(v);
        used_varying_names.push.apply(used_varying_names,
                                      _.map(v.find_if(is_varying),
                                            function (v) { 
                                                return v.eval();
                                            }));
        fp_exprs.push(Shade.set(v, k));
    });

    _.each(vp_obj, function(v, k) {
        if ((varying_names.indexOf(k) === -1) ||
            (used_varying_names.indexOf(k) !== -1))
            vp_exprs.push(Shade.set(vp_optimize(v), k));
    });

    var vp_exp = Shade.seq(vp_exprs);
    var fp_exp = Shade.seq(fp_exprs);

    vp_compile.compile(vp_exp);
    fp_compile.compile(fp_exp);
    var vp_source = vp_compile.source(),
        fp_source = fp_compile.source();
    if (Shade.debug) {
        console.log("Vertex program final AST:");
        vp_exp.debug_print();
        console.log("Vertex program source:");
        console.log(vp_source);
        console.log("Fragment program final AST:");
        fp_exp.debug_print();
        console.log("Fragment program source:");
        console.log(fp_source);
    }
    var result = Facet.program(vp_source, fp_source);
    result.attribute_buffers = vp_exp.attribute_buffers();
    result.uniforms = _.union(vp_exp.uniforms(), fp_exp.uniforms());
    return result;
};