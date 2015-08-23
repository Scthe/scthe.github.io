document.addEventListener('DOMContentLoaded', function() {
    // dynamically created references
    /*
    var post_links = document.querySelectorAll(".post a"),
        post_element = document.getElementsByClassName('post');
    if (post_element.length > 0 && post_links.length > 0) {
        post_element = post_element[0];
        var header = document.createElement("h2"),
            link_container = document.createElement("ul");
        header.textContent = "Links";
        link_container.className = "links-list";

        for (var i = 0; i < post_links.length; i++) {
            var l = post_links[i];
            if (!l.href || l.href.indexOf(window.location.host + window.location.pathname) !== -1) {
                continue;
            }
            if (l.title.length === 0) {
                continue;
            }

            // console.log(l);
            var link_el = document.createElement("li"),
                anchor_el = document.createElement("a"),
                title_el = document.createElement("div");
            anchor_el.setAttribute('href', l.href);
            anchor_el.textContent = l.href;
            title_el.textContent = l.title;
            link_el.appendChild(anchor_el);
            link_el.appendChild(title_el);
            link_container.appendChild(link_el);
        }
        post_element.appendChild(header);
        post_element.appendChild(link_container);
    }
    */

    // anchors for post's headings
    anchors.options = {
        placement: 'right',
        visible: 'always',
        icon: '§',
        class: 'content__anchor'
    };
    anchors.add('.post h2');
    anchors.add('.post h3');
});
