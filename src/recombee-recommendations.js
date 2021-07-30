function createClient() {
    return new recombee.ApiClient('kontent-dev', 'ZW3i9s1kx4jCrbZOCCbj2NDOmLCGc8AtC1HuFePppfDPNkBjP3NkBM7Ggqsv9I5E');
}

let config = null;

function updateSize() {
    const height = Math.ceil($("html").height() + 100)
    CustomElement.setHeight(height);
}

function syncSearch() {
    if (!config) {
        $.notify("Configuration not found!", "error");
        return;
    }

    $.LoadingOverlay("show");

    axios({
        method: 'post',
        url: "/.netlify/functions/recombee-init-function",
        data: {
            "projectId": config.projectId,
            "language": config.language.codename,
            "contentType": config.contentType,
            "slug": config.slugCodename,
            "appId": config.recombeeAppId,
            "apiKey": config.recombeeApiKey
        }
    })
        .catch((error) => {
            $.LoadingOverlay("hide");
            $.notify("Something went wrong, consult console for error details!", "error");
        })
        .then((response) => {
            $.LoadingOverlay("hide");
            $.notify("Search index synced!", "success");
            const synced = new Date().toISOString();
        });

}

CustomElement.init((element, _context) => {
    config = element.config || {};
    config.projectId = _context.projectId;
    config.language = _context.variant;

    // A simple function for rendering a box with recommended product
    function showItem(title, description, link, imageLink, price) {
        return [
            '<div class="col-md-4 text-center col-sm-6 col-xs-6">',
            '    <div class="thumbnail product-box" style="min-height:300px">',
            '        <div class="caption">',
            '            <strong>' + title + '</strong>',
            '            <p>' + description + '</p>',
            '            <a href="' + link + '" class="btn btn-primary" role="button">See Details</a></p>',
            '        </div>',
            '    </div>',
            '</div>'
        ].join("\n")
    }

    // Initialize client
    var client = createClient();

    // Request recommended items
    client.send(new recombee.RecommendItemsToItem(_context.itemId, null, 3,
        {
            returnProperties: true,
            includedProperties: ['title', 'description', 'link', 'image_link', 'price'],
            filter: "'title' != null AND 'availability' == \"in stock\"",
            scenario: 'related_items'
        }),
        (err, resp) => {
            if (err) {
                console.log("Could not load recomms: ", err);
                return;
            }
            // Show recommendations
            var recomms_html = resp.recomms.map(r => r.values).
                map(vals => showProduct(vals['title'], vals['description'],
                    vals['link'], vals['image_link'], vals['price']));
            document.getElementById("relatedProducts").innerHTML = recomms_html.join("\n");
        }
    );

    try {
        search.start();
        search.on('render', () => {
            updateSize();
            $("#searchButton").html(`Create/Update Search Index for ${config.language.codename} language`);
        });
    } catch (error) {
    }
});