/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */

jsio("import squill.models.DataSource as DataSource");

describe(
  "DataSource",
  function() {
    var dataSource;

    beforeEach(
      function() {
        dataSource = new DataSource({key: "id"});
      }
    );

    describe(
      "#constructor()",
      function() {
        it(
          "creates an instance of DataSource",
          function() {
            assert(dataSource instanceof DataSource, "dataSource is an instance of DataSource");
          }
        );
      }
    );

    describe(
      "#setSorter(sorter)",
      function() {
        it(
          "set the sorter",
          function() {
            dataSource.add({id: 1, name: "z"});
            dataSource.add({id: 2, name: "y"});
            dataSource.add({id: 3, name: "x"});

            dataSource.setSorter(function(item) { return item.name; });

            var expectedID = [3, 2, 1];
            var i = 0;

            dataSource.forEach(
              function(item) {
                assert(item.id === expectedID[i], "expect id " + expectedID[i]);
                i++;
              },
              this
            );

            assert(i === 3, "the callback should have been called three times");
          }
        );
      }
    );

    describe(
      "#add(item)",
      function() {
        it(
          "add an item to the dataSource",
          function() {
            dataSource.add({id: 1, name: "Hello world"});
            assert(dataSource.length === 1, "the length of the dataSource should be 1");
            var item = dataSource.getItemForID(1);
            assert(item, "item for id 1 should be set");
            assert(item.id === 1, "the id should be 1");
          }
        );
      }
    );

    describe(
      "#add(item)",
      function() {
        it(
          "change an existing item in the dataSource",
          function() {
            dataSource.add({id: 1, name: "a"});
            assert(dataSource.length === 1, "the length of the dataSource should be 1");

            dataSource.add({id: 1, name: "b"});
            var item = dataSource.getItemForID(1);
            assert(item, "item for id 1 should be set");
            assert(item.id === 1, "the id should be 1");
            assert(item.name === "b", "the name should be \"b\"");
          }
        );
      }
    );

    describe(
      "#add(items)",
      function() {
        it(
          "add items to the dataSource",
          function() {
            var item;

            dataSource.add([{id: 1, name: "Hello"}, {id: 2, name: "world"}]);
            assert(dataSource.length === 2, "the length of the dataSource should be 2");

            item = dataSource.getItemForID(1);
            assert(item, "item for id 1 should be set");
            assert(item.id === 1, "the id should be 1");
            item = dataSource.getItemForID(2);
            assert(item, "item for id 2 should be set");
            assert(item.id === 2, "the id should be 2");
          }
        );
      }
    );

    describe(
      "#remove(id)",
      function() {
        it(
          "remove an item from the dataSource",
          function() {
            var item = {id: 2, name: "Hello world"};
            dataSource.add(item);
            assert(dataSource.length === 1, "the length of the dataSource should be 1");
            dataSource.remove(2);
            assert(dataSource.length === 0, "the length of the dataSource should be 0");
          }
        );
      }
    );

    describe(
      "#clear()",
      function() {
        it(
          "clear the dataSource",
          function() {
            dataSource.add({id: 2, name: "Hello world a"});
            dataSource.add({id: 3, name: "Hello world b"});

            assert(dataSource.length === 2, "the length of the dataSource should be 2");
            dataSource.clear();
            assert(dataSource.length === 0, "the length of the dataSource should be 0");
          }
        );
      }
    );

    describe(
      "#getCount()",
      function() {
        it(
          "get the number of items",
          function() {
            dataSource.add({id: 2, name: "Hello world a"});
            dataSource.add({id: 3, name: "Hello world b"});

            assert(dataSource.getCount() === 2, "the length of the dataSource should be 2");
          }
        );
      }
    );

    describe(
      "#contains(id)",
      function() {
        it(
          "get the item for the index",
          function() {
            dataSource.add({id: 1, name: "z"});
            dataSource.add({id: 2, name: "y"});
            dataSource.add({id: 3, name: "x"});

            assert(dataSource.contains(2), "the dataSource should contain an item with id 2");
            assert(!dataSource.contains(4), "the dataSource should not contain an item with id 4");
          }
        );
      }
    );

    describe(
      "#getKey()",
      function() {
        it(
          "get the key of the dataSource",
          function() {
            assert(dataSource.getKey() === "id", "the key of the dataSource should be \"id\"");
          }
        );
      }
    );

    describe(
      "#get(id)",
      function() {
        it(
          "get an item",
          function() {
            var item;

            dataSource.add({id: 2, name: "Hello world a"});
            dataSource.add({id: 3, name: "Hello world b"});

            item = dataSource.get(2);
            assert(item.name === "Hello world a", "the name of the item should be \"Hello world a\"");
            item = dataSource.get(3);
            assert(item.name === "Hello world b", "the name of the item should be \"Hello world b\"");
          }
        );
      }
    );

    describe(
      "#getItemForIndex(index)",
      function() {
        it(
          "get the item for the index",
          function() {
            dataSource.add({id: 1, name: "z"});
            dataSource.add({id: 2, name: "y"});
            dataSource.add({id: 3, name: "x"});

            assert(dataSource.getItemForIndex(0), "get the item at index 0");
            assert(dataSource.getItemForIndex(0).name === 'z', "the name of the item at index 0 should be \"z\"");
            assert(dataSource.getItemForIndex(1), "get the item at index 1");
            assert(dataSource.getItemForIndex(1).name === 'y', "the name of the item at index 0 should be \"y\"");
            assert(dataSource.getItemForIndex(2), "get the item at index 2");
            assert(dataSource.getItemForIndex(2).name === 'x', "the name of the item at index 0 should be \"x\"");
          }
        );
      }
    );

    describe(
      "#each()",
      function() {
        it(
          "iterate over the items",
          function() {
            dataSource.add({id: 1, name: "z"});
            dataSource.add({id: 2, name: "y"});
            dataSource.add({id: 3, name: "x"});

            var i = 0;

            dataSource.forEach(
              function(item) {
                i++;
              },
              this
            );

            assert(i === 3, "the callback should have been called three times");
          }
        );
      }
    );

    describe(
      "#getFilteredDataSource(filterFn)",
      function() {
        it(
          "get a dataSource based on a filter condition",
          function() {
            dataSource.add({id: 1, name: "1"});
            dataSource.add({id: 2, name: "2"});
            dataSource.add({id: 3, name: "3"});
            dataSource.add({id: 4, name: "4"});
            dataSource.add({id: 5, name: "5"});

            var filteredDataSource = dataSource.getFilteredDataSource(
              function(item) {
                return (item.id >= 3) && (item.id & 1 === 1);
              }
            );

            assert(filteredDataSource.length === 2, "there should be 2 items");
            assert(filteredDataSource.getItemForID(3), "there should be and item with id 3");
            assert(filteredDataSource.getItemForID(5), "there should be and item with id 5");
          }
        );
      }
    );

    describe(
      "#filter(filter)",
      function() {
        it(
          "get an item by the value of a given key",
          function() {
            dataSource.add({id: 1, name: "1a"});
            dataSource.add({id: 2, name: "2a"});
            dataSource.add({id: 3, name: "3b"});

            var filteredDataSource = dataSource.filter({name:"a"});
            assert(filteredDataSource.length === 2, "there should be 2 existing items");
            assert(filteredDataSource.getItemForID(1), "there should an item with id 1");
            assert(filteredDataSource.getItemForID(2), "there should an item with id 2");
          }
        );
      }
    );

    describe(
      "#keepOnly(list)",
      function() {
        it(
          "remove all items which are not in the list",
          function() {
            var item1 = {id: 1, name: "a"};
            var item2 = {id: 2, name: "b"};
            var item3 = {id: 3, name: "c"};
            var item4 = {id: 4, name: "d"};

            dataSource.add(item1);
            dataSource.add(item2);
            dataSource.add(item3);
            dataSource.add(item4);

            assert(dataSource.length === 4, "the length of the dataSource should be 4");

            var list = [item2, item4];

            dataSource.keepOnly(list);
            assert(dataSource.length === 2, "the length of the dataSource should be 2");

            var expectedID = [2, 4];
            var i = 0;

            dataSource.forEach(
              function(item) {
                assert(item.id === expectedID[i], "expect id " + expectedID[i]);
                i++;
              },
              this
            );
          }
        );
      }
    );

    describe(
      "#toJSON()",
      function() {
        it(
          "get the dataSource as JSON",
          function() {
            dataSource.add({id: 1, name: "z"});
            dataSource.add({id: 2, name: "y"});
            dataSource.add({id: 3, name: "x"});

            var data = {
                key: "id",
                items: [
                  { id: 1, name: 'z' },
                  { id: 2, name: 'y' },
                  { id: 3, name: 'x' }
                ]
              };

            assert.deepEqual(data, dataSource.toJSON(), "check if the JSON has the expected values");
          }
        );
      }
    );

    describe(
      "#fromJSON(data)",
      function() {
        it(
          "fill the dataSource with data",
          function() {
            var data = {
              key: "id",
              items: [
                { id: 1, name: 'z' },
                { id: 2, name: 'y' },
                { id: 3, name: 'x' }
              ]
            };

            dataSource.fromJSON(data);

            assert(dataSource.length == 3, "there should be 3 items");
            assert(dataSource.getItemForIndex(0), "get the item at index 0");
            assert(dataSource.getItemForIndex(0).name === 'z', "the name of the item at index 0 should be \"z\"");
            assert(dataSource.getItemForIndex(1), "get the item at index 1");
            assert(dataSource.getItemForIndex(1).name === 'y', "the name of the item at index 0 should be \"y\"");
            assert(dataSource.getItemForIndex(2), "get the item at index 2");
            assert(dataSource.getItemForIndex(2).name === 'x', "the name of the item at index 0 should be \"x\"");
          }
        );
      }
    );

    describe(
      "#compare(dict, cb)",
      function() {
        it(
          "compare the contents of a dataSource to an array",
          function() {
            var item1 = {id: 1, name: "a"};
            var item2 = {id: 2, name: "b"};
            var item3 = {id: 3, name: "c"};
            var item4 = {id: 4, name: "d"};

            dataSource.add(item1);
            dataSource.add(item2);
            dataSource.add(item3);
            dataSource.add(item4);

            var list = [item1, item2];
            var existsID = {1:true, 2:true};
            var existsCount = 0;
            var notExistsID = {3:true, 4:true};
            var notExistsCount = 0;

            dataSource.compare(
              list,
              function(context, item, exists) {
                if (item && exists) { // Item exists in list...
                  assert(existsID[item.id], "the item should exists");
                  existsCount++;
                } else { // Item does not exist...
                  assert(notExistsID[item.id], "the item should not exists");
                  notExistsCount++;
                }
              }
            )

            assert(existsCount === 2, "there should be 2 existing items");
            assert(notExistsCount === 2, "there should be 2 non existing items");
          }
        );
      }
    );

    describe(
      "#compare(dict, cb)",
      function() {
        it(
          "compare the contents of a dataSource to an object",
          function() {
            var item1 = {id: 1, name: "a"};
            var item2 = {id: 2, name: "b"};
            var item3 = {id: 3, name: "c"};
            var item4 = {id: 4, name: "d"};

            dataSource.add(item1);
            dataSource.add(item2);
            dataSource.add(item3);
            dataSource.add(item4);

            var obj = {1:item1, 2:item2}; // The index in the object is expected to be the same as the id...
            var existsID = {1:true, 2:true};
            var existsCount = 0;
            var notExistsID = {3:true, 4:true};
            var notExistsCount = 0;

            dataSource.compare(
              obj,
              function(context, item, exists) {
                if (item && exists) { // Item exists in list...
                  assert(existsID[item.id], "the item should exists");
                  existsCount++;
                } else { // Item does not exist...
                  assert(notExistsID[item.id], "the item should not exists");
                  notExistsCount++;
                }
              }
            )

            assert(existsCount === 2, "there should be 2 existing items");
            assert(notExistsCount === 2, "there should be 2 non existing items");
          }
        );
      }
    );

    describe(
      "#toArray()",
      function() {
        it(
          "compare the contents of a dataSource to an object",
          function() {
            var item1 = {id: 1, name: "a"};
            var item2 = {id: 2, name: "b"};
            var item3 = {id: 3, name: "c"};
            var item4 = {id: 4, name: "d"};

            dataSource.add(item1);
            dataSource.add(item2);
            dataSource.add(item3);
            dataSource.add(item4);

            var array = dataSource.toArray();
            assert(array.length === 4, "the length of the array should be 4");
            assert(Object.keys(array[0]).length === 2, "there should be 2 fields in the item");
          }
        );
      }
    );
  }
);