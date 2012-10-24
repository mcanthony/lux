Shade.Scale.transformed = function(opts)
{
    if (_.isUndefined(opts.transform)) {
        throw "Shade.Scale.transform expects a domain transformation function";
    };
    var linear_scale = Shade.Scale.linear(opts);
    return Shade(function(x) {
        return linear_scale(opts.transform(x));
    });
};
