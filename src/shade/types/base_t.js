Shade.Types.base_t = {
    is_floating: function() { return false; },
    is_integral: function() { return false; },
    is_array: function()    { return false; },
    // POD = plain old data (ints, bools, floats)
    is_pod: function()      { return false; },
    is_vec: function()      { return false; },
    vec_dimension: function() { 
        throw "is_vec() === false, cannot call vec_dimension";
    },
    is_function: function() { return false; },
    is_sampler:  function() { return false; },
    equals: function(other) {
        if (typeOf(other) === 'undefined')
            throw "Type.equals can't be compared to undefined";
        return this.repr() == other.repr();
    },
    swizzle: function(pattern) {
        throw "type '" + this.repr() + "' does not support swizzling.";
    },
    element_type: function(i) {
        throw "invalid call: atomic expression";
    },
    declare: function(glsl_name) {
        return this.repr() + " " + glsl_name;
    }
    // repr
    // array_base
    // array_size
    // function_return_type
    // function_parameter
    // function_parameter_count
};