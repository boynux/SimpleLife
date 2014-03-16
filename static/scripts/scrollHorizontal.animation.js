function scrollHorizontal (params) {
    console.debug ('scroll horizontal callaed!');
    var rows = 3;
    var cols = Math.ceil (params.itemsCount / rows);

    var offsetX = - params.clientSize.width / 2;
    var offsetY = - params.clientSize.height / 2;

    var padding = 10;

    var speed = [];

    var width = params.clientSize.width / cols;
    var height = params.clientSize.height / rows;

    return [function (i, item) {
        var itemHeight = Math.floor (params.picture_repository[item.get ('name')].height * params.scale / rows);
        var itemWidth = Math.floor (params.picture_repository[item.get ('name')].width * params.scale / rows);

        var x = offsetX + (Math.floor(i / rows) % cols) * width + padding * (Math.floor(i / rows) % cols);
        var y = offsetY + (i % rows) * height;

        speed[i] = (Math.random () * 100 % 10 + 5) / 5;

        var itemProperties = params.picture_repository[item.get ('name')];

        return {
            x: x,
            y: (y + itemHeight < params.clientSize.height / 2) ? y : (params.clientSize.height / 2 - itemHeight),

            width: Math.floor (itemProperties.width * params.scale / rows),
            height: Math.floor (itemProperties.height * params.scale / rows),

            zIndex: speed[i] * 10,
        }
    }, function (frame, i, to, item) {
        var width = item.get("width") * item.get("scaleX");

        to.x -= speed[i] * params.currentSpeed;

        if (to.x > params.clientSize.width) {
            to.x = -width;
        } else if (to.x < -width) {
            to.x = params.clientSize.width;
        }
    }];
}

