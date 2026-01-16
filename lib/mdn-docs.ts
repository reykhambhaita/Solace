// MDN documentation database (subset - expand as needed)
export interface MDNDocEntry {
  description: string;
  mdn: string;
}

export const MDN_DOCS: Record<string, MDNDocEntry> = {
  // JavaScript built-ins
  "console": {
    description: "The console object provides access to the browser's debugging console.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/API/Console"
  },
  "log": {
    description: "Outputs a message to the console.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/API/Console/log"
  },
  "Array": {
    description: "The Array object enables storing a collection of multiple items under a single variable name.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array"
  },
  "map": {
    description: "Creates a new array populated with the results of calling a provided function on every element.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map"
  },
  "filter": {
    description: "Creates a shallow copy of a portion of a given array, filtered down to just the elements that pass the test.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter"
  },
  "forEach": {
    description: "Executes a provided function once for each array element.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach"
  },
  "reduce": {
    description: "Executes a reducer function on each element, resulting in a single output value.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce"
  },
  "push": {
    description: "Adds one or more elements to the end of an array and returns the new length.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push"
  },
  "pop": {
    description: "Removes the last element from an array and returns that element.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop"
  },
  "String": {
    description: "The String object is used to represent and manipulate a sequence of characters.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String"
  },
  "split": {
    description: "Divides a String into an ordered list of substrings and returns them in an array.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split"
  },
  "join": {
    description: "Creates and returns a new string by concatenating all elements in an array.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join"
  },
  "slice": {
    description: "Returns a shallow copy of a portion of an array into a new array object.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice"
  },
  "Object": {
    description: "The Object type represents one of JavaScript's data types.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object"
  },
  "keys": {
    description: "Returns an array of a given object's own enumerable property names.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys"
  },
  "values": {
    description: "Returns an array of a given object's own enumerable property values.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values"
  },
  "Promise": {
    description: "The Promise object represents the eventual completion (or failure) of an asynchronous operation.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise"
  },
  "async": {
    description: "The async function declaration defines an asynchronous function.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function"
  },
  "await": {
    description: "The await operator is used to wait for a Promise.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await"
  },
  "fetch": {
    description: "The fetch() method starts the process of fetching a resource from the network.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch"
  },
  "setTimeout": {
    description: "Sets a timer which executes a function once after the timer expires.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/API/setTimeout"
  },
  "setInterval": {
    description: "Repeatedly calls a function with a fixed time delay between each call.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/API/setInterval"
  },
  "JSON": {
    description: "The JSON object contains methods for parsing and converting values to JSON.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON"
  },
  "parse": {
    description: "Parses a JSON string, constructing the JavaScript value or object described.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse"
  },
  "stringify": {
    description: "Converts a JavaScript value to a JSON string.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify"
  },
  "Math": {
    description: "The Math namespace object contains static properties and methods for mathematical constants and functions.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math"
  },
  "random": {
    description: "Returns a floating-point, pseudo-random number between 0 (inclusive) and 1 (exclusive).",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random"
  },
  "floor": {
    description: "Returns the largest integer less than or equal to a given number.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor"
  },
  "ceil": {
    description: "Returns the smallest integer greater than or equal to a given number.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/ceil"
  },
  "round": {
    description: "Returns the value of a number rounded to the nearest integer.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round"
  },
  "Date": {
    description: "Creates a JavaScript Date instance that represents a single moment in time.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date"
  },
  "now": {
    description: "Returns the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now"
  },
  "parseInt": {
    description: "Parses a string argument and returns an integer of the specified radix.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt"
  },
  "parseFloat": {
    description: "Parses a string argument and returns a floating point number.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat"
  },
  "isNaN": {
    description: "Determines whether a value is NaN (Not-A-Number).",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN"
  },
  "Set": {
    description: "The Set object lets you store unique values of any type.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set"
  },
  "Map": {
    description: "The Map object holds key-value pairs and remembers the original insertion order.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map"
  },
  "WeakMap": {
    description: "The WeakMap object is a collection of key/value pairs where keys are weakly referenced.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap"
  },
  "Symbol": {
    description: "Symbol is a built-in object whose constructor returns a symbol primitive.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol"
  },
  "Error": {
    description: "Error objects are thrown when runtime errors occur.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error"
  },
  "RegExp": {
    description: "The RegExp object is used for matching text with a pattern.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp"
  },
  "test": {
    description: "Executes a search for a match between a regular expression and a string.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/test"
  },
  "match": {
    description: "Retrieves the result of matching a string against a regular expression.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match"
  },
  "replace": {
    description: "Returns a new string with some or all matches of a pattern replaced.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace"
  },
  "includes": {
    description: "Determines whether an array/string includes a certain value, returning true or false.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes"
  },
  "indexOf": {
    description: "Returns the first index at which a given element can be found, or -1 if not present.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf"
  },
  "find": {
    description: "Returns the first element in the array that satisfies the provided testing function.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find"
  },
  "some": {
    description: "Tests whether at least one element in the array passes the test.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some"
  },
  "every": {
    description: "Tests whether all elements in the array pass the test.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every"
  },
  "sort": {
    description: "Sorts the elements of an array in place and returns the sorted array.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort"
  },
  "reverse": {
    description: "Reverses an array in place and returns the reference to the same array.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse"
  },
  "concat": {
    description: "Merges two or more arrays/strings and returns a new array/string.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat"
  },
  "length": {
    description: "The length property represents the number of elements in an array or characters in a string.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length"
  },
  "constructor": {
    description: "Returns a reference to the constructor function that created the instance object.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor"
  },
  "prototype": {
    description: "Allows you to add properties and methods to all instances of an object.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/prototype"
  },
  "class": {
    description: "The class declaration creates a new class with a given name.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/class"
  },
  "extends": {
    description: "Used in class declarations to create a class that is a child of another class.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends"
  },
  "super": {
    description: "Used to access and call functions on an object's parent.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/super"
  },
  "this": {
    description: "Refers to the object it belongs to.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this"
  },
  "new": {
    description: "Creates an instance of a user-defined object type or a built-in object.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new"
  },
  "instanceof": {
    description: "Tests whether an object is an instance of a specific constructor.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof"
  },
  "typeof": {
    description: "Returns a string indicating the type of the operand.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof"
  },
  "delete": {
    description: "Removes a property from an object.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete"
  },
  "void": {
    description: "Evaluates the given expression and then returns undefined.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void"
  },
  "in": {
    description: "Returns true if the specified property is in the object.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in"
  },
  "of": {
    description: "Creates a loop iterating over iterable objects.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of"
  },
  "let": {
    description: "Declares a block-scoped local variable.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let"
  },
  "const": {
    description: "Declares a block-scoped constant.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const"
  },
  "var": {
    description: "Declares a function-scoped or globally-scoped variable.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var"
  },
  "function": {
    description: "Declares a function with the specified parameters.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function"
  },
  "return": {
    description: "Ends function execution and specifies a value to be returned.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/return"
  },
  "if": {
    description: "Executes a statement if a specified condition is truthy.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else"
  },
  "else": {
    description: "Executes a statement if the condition in the if statement is falsy.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else"
  },
  "switch": {
    description: "Evaluates an expression and executes statements associated with matching case.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch"
  },
  "case": {
    description: "Specifies a case to match against in a switch statement.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch"
  },
  "break": {
    description: "Terminates the current loop, switch, or label statement.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/break"
  },
  "continue": {
    description: "Terminates execution of statements in the current iteration and continues with next.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/continue"
  },
  "for": {
    description: "Creates a loop that consists of three optional expressions.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for"
  },
  "while": {
    description: "Creates a loop that executes while a specified condition is true.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while"
  },
  "do": {
    description: "Creates a loop that executes until the test condition evaluates to false.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/do...while"
  },
  "try": {
    description: "Marks a block of statements to try and specifies error handling.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch"
  },
  "catch": {
    description: "Specifies statements to execute if an exception is thrown in the try block.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch"
  },
  "finally": {
    description: "Executes code after try and catch, regardless of the result.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch"
  },
  "throw": {
    description: "Throws a user-defined exception.",
    mdn: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/throw"
  },

  // TypeScript specific
  "interface": {
    description: "Defines a contract for the shape of an object in TypeScript.",
    mdn: "https://www.typescriptlang.org/docs/handbook/2/objects.html"
  },
  "type": {
    description: "Creates a type alias in TypeScript.",
    mdn: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases"
  },
  "enum": {
    description: "Defines a set of named constants in TypeScript.",
    mdn: "https://www.typescriptlang.org/docs/handbook/enums.html"
  },
  "namespace": {
    description: "Organizes code into logical groups in TypeScript.",
    mdn: "https://www.typescriptlang.org/docs/handbook/namespaces.html"
  },
  "as": {
    description: "Type assertion in TypeScript to tell the compiler about a value's type.",
    mdn: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions"
  },
  "keyof": {
    description: "Takes an object type and produces a string or numeric literal union of its keys.",
    mdn: "https://www.typescriptlang.org/docs/handbook/2/keyof-types.html"
  },
  "readonly": {
    description: "Makes properties in TypeScript unable to be changed after initialization.",
    mdn: "https://www.typescriptlang.org/docs/handbook/2/objects.html#readonly-properties"
  },
  "generic": {
    description: "Creates reusable components that work with multiple types in TypeScript.",
    mdn: "https://www.typescriptlang.org/docs/handbook/2/generics.html"
  },

  // Python built-ins
  "print": {
    description: "Outputs objects to the text stream in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#print"
  },
  "len": {
    description: "Returns the length (number of items) of an object in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#len"
  },
  "range": {
    description: "Returns a sequence of numbers in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#func-range"
  },
  "list": {
    description: "Creates a mutable sequence type in Python.",
    mdn: "https://docs.python.org/3/library/stdtypes.html#list"
  },
  "dict": {
    description: "Creates a mapping type in Python that stores key-value pairs.",
    mdn: "https://docs.python.org/3/library/stdtypes.html#dict"
  },
  "tuple": {
    description: "Creates an immutable sequence type in Python.",
    mdn: "https://docs.python.org/3/library/stdtypes.html#tuple"
  },
  "set": {
    description: "Creates an unordered collection of unique elements in Python.",
    mdn: "https://docs.python.org/3/library/stdtypes.html#set"
  },
  "str": {
    description: "Returns a string version of an object in Python.",
    mdn: "https://docs.python.org/3/library/stdtypes.html#str"
  },
  "int": {
    description: "Returns an integer object constructed from a number or string in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#int"
  },
  "float": {
    description: "Returns a floating point number from a number or string in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#float"
  },
  "bool": {
    description: "Returns a Boolean value in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#bool"
  },
  "input": {
    description: "Reads a line from input in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#input"
  },
  "open": {
    description: "Opens a file and returns a corresponding file object in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#open"
  },
  "enumerate": {
    description: "Returns an enumerate object that yields pairs of index and value in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#enumerate"
  },
  "zip": {
    description: "Makes an iterator that aggregates elements from iterables in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#zip"
  },
  "sorted": {
    description: "Returns a sorted list from the items in an iterable in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#sorted"
  },
  "sum": {
    description: "Sums items of an iterable from left to right in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#sum"
  },
  "max": {
    description: "Returns the largest item in an iterable in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#max"
  },
  "min": {
    description: "Returns the smallest item in an iterable in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#min"
  },
  "abs": {
    description: "Returns the absolute value of a number in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#abs"
  },
  "all": {
    description: "Returns True if all elements of the iterable are true in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#all"
  },
  "any": {
    description: "Returns True if any element of the iterable is true in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#any"
  },
  "isinstance": {
    description: "Checks if an object is an instance of a class in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#isinstance"
  },
  "type_py": {
    description: "Returns the type of an object in Python.",
    mdn: "https://docs.python.org/3/library/functions.html#type"
  },
  "lambda": {
    description: "Creates anonymous functions in Python.",
    mdn: "https://docs.python.org/3/reference/expressions.html#lambda"
  },
  "yield": {
    description: "Used in generator functions to return values in Python.",
    mdn: "https://docs.python.org/3/reference/simple_stmts.html#yield"
  },
  "with": {
    description: "Wraps execution of a block with methods defined by a context manager in Python.",
    mdn: "https://docs.python.org/3/reference/compound_stmts.html#with"
  },
  "def": {
    description: "Defines a function in Python.",
    mdn: "https://docs.python.org/3/reference/compound_stmts.html#function-definitions"
  },
  "class_py": {
    description: "Defines a class in Python.",
    mdn: "https://docs.python.org/3/reference/compound_stmts.html#class-definitions"
  },
  "import": {
    description: "Imports modules in Python.",
    mdn: "https://docs.python.org/3/reference/simple_stmts.html#import"
  },
  "from": {
    description: "Imports specific attributes from a module in Python.",
    mdn: "https://docs.python.org/3/reference/simple_stmts.html#import"
  },
  "pass": {
    description: "A null operation statement in Python.",
    mdn: "https://docs.python.org/3/reference/simple_stmts.html#pass"
  },
  "raise": {
    description: "Raises an exception in Python.",
    mdn: "https://docs.python.org/3/reference/simple_stmts.html#raise"
  },
  "assert": {
    description: "Tests if a condition is true in Python, raises AssertionError if false.",
    mdn: "https://docs.python.org/3/reference/simple_stmts.html#assert"
  },

  // C++ built-ins
  "std_cout": {
    description: "Standard output stream in C++.",
    mdn: "https://cplusplus.com/reference/iostream/cout/"
  },
  "std_cin": {
    description: "Standard input stream in C++.",
    mdn: "https://cplusplus.com/reference/iostream/cin/"
  },
  "std_vector": {
    description: "Dynamic array container in C++ STL.",
    mdn: "https://cplusplus.com/reference/vector/vector/"
  },
  "std_string": {
    description: "String class in C++ STL.",
    mdn: "https://cplusplus.com/reference/string/string/"
  },
  "std_map": {
    description: "Associative container that stores key-value pairs in C++.",
    mdn: "https://cplusplus.com/reference/map/map/"
  },
  "std_set": {
    description: "Container that stores unique elements in sorted order in C++.",
    mdn: "https://cplusplus.com/reference/set/set/"
  },
  "std_unordered_map": {
    description: "Hash table implementation of map in C++.",
    mdn: "https://cplusplus.com/reference/unordered_map/unordered_map/"
  },
  "std_shared_ptr": {
    description: "Smart pointer with shared ownership in C++.",
    mdn: "https://cplusplus.com/reference/memory/shared_ptr/"
  },
  "std_unique_ptr": {
    description: "Smart pointer with unique ownership in C++.",
    mdn: "https://cplusplus.com/reference/memory/unique_ptr/"
  },
  "std_move": {
    description: "Casts an lvalue to an rvalue reference in C++.",
    mdn: "https://cplusplus.com/reference/utility/move/"
  },
  "std_sort": {
    description: "Sorts elements in a range in C++.",
    mdn: "https://cplusplus.com/reference/algorithm/sort/"
  },
  "std_find": {
    description: "Finds element in a range in C++.",
    mdn: "https://cplusplus.com/reference/algorithm/find/"
  },
  "template": {
    description: "Defines generic functions or classes in C++.",
    mdn: "https://cplusplus.com/doc/oldtutorial/templates/"
  },
  "namespace_cpp": {
    description: "Defines a scope for identifiers in C++.",
    mdn: "https://cplusplus.com/doc/tutorial/namespaces/"
  },
  "virtual": {
    description: "Specifies a virtual function for polymorphism in C++.",
    mdn: "https://cplusplus.com/doc/tutorial/polymorphism/"
  },
  "override": {
    description: "Explicitly declares that a method overrides a base class method in C++.",
    mdn: "https://en.cppreference.com/w/cpp/language/override"
  },
  "nullptr": {
    description: "Null pointer literal in C++.",
    mdn: "https://cplusplus.com/reference/cstddef/nullptr_t/"
  },
  "auto": {
    description: "Automatic type deduction in C++.",
    mdn: "https://cplusplus.com/doc/tutorial/auto/"
  },
  "constexpr": {
    description: "Specifies that value can be evaluated at compile time in C++.",
    mdn: "https://cplusplus.com/reference/constexpr/"
  },

  // Rust built-ins
  "println": {
    description: "Macro that prints to stdout with a newline in Rust.",
    mdn: "https://doc.rust-lang.org/std/macro.println.html"
  },
  "Vec": {
    description: "Growable array type in Rust.",
    mdn: "https://doc.rust-lang.org/std/vec/struct.Vec.html"
  },
  "String_rust": {
    description: "Growable UTF-8 encoded string type in Rust.",
    mdn: "https://doc.rust-lang.org/std/string/struct.String.html"
  },
  "Option": {
    description: "Type that represents an optional value in Rust.",
    mdn: "https://doc.rust-lang.org/std/option/enum.Option.html"
  },
  "Result": {
    description: "Type for returning and propagating errors in Rust.",
    mdn: "https://doc.rust-lang.org/std/result/enum.Result.html"
  },
  "Box": {
    description: "Heap-allocated smart pointer in Rust.",
    mdn: "https://doc.rust-lang.org/std/boxed/struct.Box.html"
  },
  "Rc": {
    description: "Reference-counted smart pointer in Rust.",
    mdn: "https://doc.rust-lang.org/std/rc/struct.Rc.html"
  },
  "Arc": {
    description: "Thread-safe reference-counted smart pointer in Rust.",
    mdn: "https://doc.rust-lang.org/std/sync/struct.Arc.html"
  },
  "HashMap": {
    description: "Hash map implementation in Rust.",
    mdn: "https://doc.rust-lang.org/std/collections/struct.HashMap.html"
  },
  "HashSet": {
    description: "Hash set implementation in Rust.",
    mdn: "https://doc.rust-lang.org/std/collections/struct.HashSet.html"
  },
  "impl": {
    description: "Implements traits or methods for a type in Rust.",
    mdn: "https://doc.rust-lang.org/std/keyword.impl.html"
  },
  "trait": {
    description: "Defines shared behavior in Rust.",
    mdn: "https://doc.rust-lang.org/book/ch10-02-traits.html"
  },
  "mut": {
    description: "Makes a binding or reference mutable in Rust.",
    mdn: "https://doc.rust-lang.org/std/keyword.mut.html"
  },
  "ref": {
    description: "Creates a reference binding in pattern matching in Rust.",
    mdn: "https://doc.rust-lang.org/std/keyword.ref.html"
  },
  "match_rust": {
    description: "Pattern matching control flow in Rust.",
    mdn: "https://doc.rust-lang.org/book/ch06-02-match.html"
  },
  "unwrap": {
    description: "Extracts value from Option/Result or panics in Rust.",
    mdn: "https://doc.rust-lang.org/std/option/enum.Option.html#method.unwrap"
  },
  "clone": {
    description: "Creates a deep copy of a value in Rust.",
    mdn: "https://doc.rust-lang.org/std/clone/trait.Clone.html"
  },
  "iter": {
    description: "Creates an iterator in Rust.",
    mdn: "https://doc.rust-lang.org/std/iter/trait.Iterator.html"
  },
  "collect": {
    description: "Transforms an iterator into a collection in Rust.",
    mdn: "https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.collect"
  },
  "panic": {
    description: "Causes the current thread to panic in Rust.",
    mdn: "https://doc.rust-lang.org/std/macro.panic.html"
  },

  // PHP built-ins
  "echo": {
    description: "Outputs one or more strings in PHP.",
    mdn: "https://www.php.net/manual/en/function.echo.php"
  },
  "var_dump": {
    description: "Dumps information about a variable in PHP.",
    mdn: "https://www.php.net/manual/en/function.var-dump.php"
  },
  "array_php": {
    description: "Creates an array in PHP.",
    mdn: "https://www.php.net/manual/en/function.array.php"
  },
  "count": {
    description: "Counts elements in an array or object in PHP.",
    mdn: "https://www.php.net/manual/en/function.count.php"
  },
  "array_push": {
    description: "Pushes one or more elements onto the end of array in PHP.",
    mdn: "https://www.php.net/manual/en/function.array-push.php"
  },
  "array_map_php": {
    description: "Applies a callback to elements of arrays in PHP.",
    mdn: "https://www.php.net/manual/en/function.array-map.php"
  },
  "array_filter_php": {
    description: "Filters elements of an array using a callback in PHP.",
    mdn: "https://www.php.net/manual/en/function.array-filter.php"
  },
  "array_reduce": {
    description: "Iteratively reduces array to a single value using callback in PHP.",
    mdn: "https://www.php.net/manual/en/function.array-reduce.php"
  },
  "json_encode": {
    description: "Returns JSON representation of a value in PHP.",
    mdn: "https://www.php.net/manual/en/function.json-encode.php"
  },
  "json_decode": {
    description: "Decodes a JSON string in PHP.",
    mdn: "https://www.php.net/manual/en/function.json-decode.php"
  },
  "isset": {
    description: "Determines if a variable is declared and different from null in PHP.",
    mdn: "https://www.php.net/manual/en/function.isset.php"
  },
  "empty": {
    description: "Determines whether a variable is empty in PHP.",
    mdn: "https://www.php.net/manual/en/function.empty.php"
  },
  "explode": {
    description: "Splits a string by a delimiter in PHP.",
    mdn: "https://www.php.net/manual/en/function.explode.php"
  },
  "implode": {
    description: "Joins array elements with a string in PHP.",
    mdn: "https://www.php.net/manual/en/function.implode.php"
  },
  "strlen": {
    description: "Returns the length of a string in PHP.",
    mdn: "https://www.php.net/manual/en/function.strlen.php"
  },
  "substr": {
    description: "Returns part of a string in PHP.",
    mdn: "https://www.php.net/manual/en/function.substr.php"
  },
  "strpos": {
    description: "Finds position of first occurrence of substring in PHP.",
    mdn: "https://www.php.net/manual/en/function.strpos.php"
  },
  "str_replace": {
    description: "Replaces all occurrences of search string with replacement in PHP.",
    mdn: "https://www.php.net/manual/en/function.str-replace.php"
  },
  "preg_match": {
    description: "Performs a regular expression match in PHP.",
    mdn: "https://www.php.net/manual/en/function.preg-match.php"
  },
  "file_get_contents": {
    description: "Reads entire file into a string in PHP.",
    mdn: "https://www.php.net/manual/en/function.file-get-contents.php"
  },
  "header": {
    description: "Sends a raw HTTP header in PHP.",
    mdn: "https://www.php.net/manual/en/function.header.php"
  },

  // Go built-ins
  "fmt_Println": {
    description: "Prints to standard output with newline in Go.",
    mdn: "https://pkg.go.dev/fmt#Println"
  },
  "fmt_Printf": {
    description: "Formats according to format specifier and writes to stdout in Go.",
    mdn: "https://pkg.go.dev/fmt#Printf"
  },
  "make": {
    description: "Allocates and initializes slices, maps, or channels in Go.",
    mdn: "https://go.dev/ref/spec#Making_slices_maps_and_channels"
  },
  "append": {
    description: "Appends elements to a slice in Go.",
    mdn: "https://go.dev/ref/spec#Appending_and_copying_slices"
  },
  "len_go": {
    description: "Returns length of array, slice, string, map, or channel in Go.",
    mdn: "https://go.dev/ref/spec#Length_and_capacity"
  },
  "cap": {
    description: "Returns capacity of array, slice, or channel in Go.",
    mdn: "https://go.dev/ref/spec#Length_and_capacity"
  },
  "copy": {
    description: "Copies elements from source to destination slice in Go.",
    mdn: "https://go.dev/ref/spec#Appending_and_copying_slices"
  },
  "delete_go": {
    description: "Deletes an element from a map in Go.",
    mdn: "https://go.dev/ref/spec#Deletion_of_map_elements"
  },
  "defer": {
    description: "Defers execution of a function until surrounding function returns in Go.",
    mdn: "https://go.dev/ref/spec#Defer_statements"
  },
  "go": {
    description: "Starts execution of a function call as a goroutine in Go.",
    mdn: "https://go.dev/ref/spec#Go_statements"
  },
  "chan": {
    description: "Declares a channel type in Go.",
    mdn: "https://go.dev/ref/spec#Channel_types"
  },
  "select": {
    description: "Waits on multiple channel operations in Go.",
    mdn: "https://go.dev/ref/spec#Select_statements"
  },
  "range_go": {
    description: "Iterates over elements in arrays, slices, maps, channels in Go.",
    mdn: "https://go.dev/ref/spec#For_statements"
  },
  "interface_go": {
    description: "Defines a set of method signatures in Go.",
    mdn: "https://go.dev/ref/spec#Interface_types"
  },
  "struct": {
    description: "Defines a composite data type in Go.",
    mdn: "https://go.dev/ref/spec#Struct_types"
  },
  "panic_go": {
    description: "Stops normal execution and begins panicking in Go.",
    mdn: "https://go.dev/ref/spec#Handling_panics"
  },
  "recover": {
    description: "Regains control of a panicking goroutine in Go.",
    mdn: "https://go.dev/ref/spec#Handling_panics"
  },
  "close": {
    description: "Closes a channel in Go.",
    mdn: "https://go.dev/ref/spec#Close"
  },
  "new_go": {
    description: "Allocates memory and returns a pointer in Go.",
    mdn: "https://go.dev/ref/spec#Allocation"
  },
  "iota": {
    description: "Represents successive integer constants in Go.",
    mdn: "https://go.dev/ref/spec#Iota"
  }
};

export type MDNDocKey = keyof typeof MDN_DOCS;

/**
 * Helper function to get MDN documentation for a word based on the current language.
 * It prioritizes language-specific keys (e.g. "match_rust") over generic ones.
 */
export function getMDNDoc(word: string, language: string): MDNDocEntry | null {
  // Map languages to their specific suffixes in the MDN_DOCS keys
  const langSuffixes: Record<string, string> = {
    'rust': '_rust',
    'go': '_go',
    'python': '_py',
    'cpp': '_cpp', // If needed in future
    'php': '_php',
    'javascript': '',
    'typescript': ''
  };

  const suffix = langSuffixes[language];

  // 1. Try language-specific key first if a suffix exists
  if (suffix) {
    const langSpecificKey = `${word}${suffix}`;
    if (langSpecificKey in MDN_DOCS) {
      return MDN_DOCS[langSpecificKey as MDNDocKey];
    }
  }

  // 2. Fallback to exact match (generic/shared keys)
  if (word in MDN_DOCS) {
    return MDN_DOCS[word as MDNDocKey];
  }

  return null;
}
