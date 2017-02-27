angular.module('app.filters',[])
.filter('shorttext', function() {
    return function (str, maxlength) {
        if (!str) {
            return "";
        }

        if (str.length <= maxlength) {
            return str;
        } else {
            return str.slice(0, maxlength)+ "...";
        }
    }
})