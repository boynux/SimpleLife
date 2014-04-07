function scrollHorizontal (animationService) {
    console.debug ('scroll horizontal callaed!');

    var parameters = animationService.getParameters ();
    var imagesInfo = animationService.getImagesInfo ();
    console.debug (parameters);

    var rows = 3;
    var cols = Math.ceil (imagesInfo.count / rows);

    var offsetX = - parameters.clientSize.width / 2;
    var offsetY = - parameters.clientSize.height / 2;

    var padding = 30;

    var speed = [];

    var virtualWidth = Math.max (
        imagesInfo.averageWidth * cols / rows, 
        parameters.clientSize.width
    );

    var width = virtualWidth / cols;
    var height = parameters.clientSize.height / rows;

    console.debug (virtualWidth, parameters.clientSize.width);

    return [function (i, item) {
        var itemHeight = 0;
        var itemWidth = 0;

        if (item.getImageSize ()) {
            itemHeight = Math.floor (item.getImageSize ().height / rows);
            itemWidth = Math.floor (item.getImageSize ().width / rows);
        }

        var x = offsetX + (Math.floor(i / rows) % cols) * width + padding * (Math.floor(i / rows) % cols);
        var y = offsetY + (i % rows) * height;

        speed[i] = (Math.random () * 100 % 10 + 5) / 5;

        var itemProperties = animationService.getImage (item.get ("name"));

        var transform = {
            x: x,
            y: (y + itemHeight < parameters.clientSize.height / 2) ? y : (parameters.clientSize.height / 2 - itemHeight),

            width: Math.floor (itemProperties.width / rows),
            height: Math.floor (itemProperties.height / rows),

            zIndex: speed[i] * 10,
        }

        return transform;
    }, function (frame, i, to, item) {
        var width = item.get("width");

        to.x -= Math.floor (speed[i] * parameters.animation.currentSpeed);

        if (to.x > virtualWidth) {
            to.x = -width;
        } else if (to.x < -width) {
            to.x = virtualWidth;
        }
    }];
}

