var _ = require('lodash');

module.exports = {


    splitIntoGroups: function(l, n) {
        // split an array into groups of size N
        var arrays = [];
        while (l.length > 0) {
            arrays.push(l.splice(0, n));
        }

        return arrays;

    },

    sortByKey: function(l, key) {
        return _.sortBy(l, key);
    },

    possessifyName: function(name) {
        var lastChar = name.substr(name.length - 1);

        if(lastChar === 's') {
            return name + '\'';
        }
        return name + '\'s';
    }

};