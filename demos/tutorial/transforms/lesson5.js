function addScatterplot(json)
{
    var lats = makeBuffer(json, "lat"),
        lons = makeBuffer(json, "lon");
    var dots = Lux.Marks.dots({
        position: Shade.vec(lats, lons),
        fillColor: Shade.color("white"),
        strokeWidth: 1,
        elements: json.length
    });
    var scene = Lux.Scene;
    var latLonScene = Lux.Scene.Transform.Geo.latlongToMercator();
    var degreesScene = Lux.scene({ transform: deg2rad });
    scene.add(latLonScene);
    latLonScene.add(degreesScene);
    degreesScene.add(dots);

    function brush(b1, b2) {
        var min = [Math.min(b1[0], b2[0]), Math.min(b1[1], b2[1])];
        var max = [Math.max(b1[0], b2[0]), Math.max(b1[1], b2[1])];
        $("#min-lat").text(min[0]);
        $("#max-lat").text(max[0]);
        $("#min-lon").text(min[1]);
        $("#max-lon").text(max[1]);        
    }
    degreesScene.add(Lux.Marks.rectangleBrush({
        on: { brushChanged: brush },
        acceptEvent: function(event) { return event.shiftKey; }
    }));
}

$().ready(function () {
    Lux.init({
        interactor: Lux.UI.centerZoomInteractor({width: 720, height: 720, zoom: 0.5}),
        clearColor: [0, 0, 0, 0.2]
    });
    Lux.Net.json("airports.json", addScatterplot);
});

//////////////////////////////////////////////////////////////////////////////

// transformation spec
function deg2rad(appearance) {
    appearance = _.clone(appearance);
    appearance.position = Shade.radians(appearance.position);
    return appearance;
}
function rad2deg(appearance) {
    appearance = _.clone(appearance);
    appearance.position = Shade.degrees(appearance.position);
    return appearance;
}
deg2rad.inverse = rad2deg;
rad2deg.inverse = deg2rad;

function makeBuffer(json, field) {
    return Lux.attributeBuffer({
        vertexArray: _.map(json, function(o) { return o[field]; }), 
        itemSize: 1
    });
};
