// =========================================================
// REVIEWLY — COMMON APP JAVASCRIPT
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    // Mark the current page in the navigation
    setActiveNavigation();

});


// ---------------------------------------------------------
// ACTIVE NAVIGATION
// ---------------------------------------------------------

function setActiveNavigation() {

    const currentPage =
        window.location.pathname
            .split("/")
            .pop() || "index.html";


    const navigationLinks =
        document.querySelectorAll(".nav-link");


    navigationLinks.forEach(link => {

        const linkPage =
            link.getAttribute("href");


        if (linkPage === currentPage) {

            link.classList.add("active");

        } else {

            link.classList.remove("active");

        }

    });

}