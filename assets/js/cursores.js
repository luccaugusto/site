function cursores() {
//numero aleatorio de 1 a (numero de cursores + 1) para ter o cursor padrao
    var curs = Math.floor((Math.random() * (100)) + 1) % (8+1);
    if (curs == 1) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/finn.cur'), auto";
    }
    else if (curs == 2) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/fuck.cur'), auto";
    }
    else if (curs == 3) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/gunter.cur'), auto";
    }
    else if (curs == 4) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/jake.cur'), auto";
    }
    else if (curs == 5) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/kunai.cur'), auto";
    }
    else if (curs == 6) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/multi.cur'), auto";
    }
    else if (curs == 7) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/OchaNonde.cur'), auto";
    }
    else if (curs == 8) {
        var elementToChange = document.getElementsByTagName('body')[0];
        elementToChange.style.cursor = "url('/cursores/Windows_CursorR.cur'), auto";
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cursores);
} else {
    cursores();
}
