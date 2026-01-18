export interface LanguageConfig {
  keywords: string[];
  builtins: string[];
  snippets: {
    label: string;
    documentation: string;
    insertText: string;
  }[];
}

export const LANGUAGE_CONFIG: Record<string, LanguageConfig> = {
  python: {
    keywords: [
      'def', 'class', 'if', 'else', 'elif', 'while', 'for', 'in', 'try', 'except',
      'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'pass', 'break',
      'continue', 'global', 'nonlocal', 'lambda', 'and', 'or', 'not', 'is', 'None',
      'True', 'False', 'async', 'await'
    ],
    builtins: [
      'print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'int', 'str', 'float',
      'bool', 'super', 'isinstance', 'type', 'sum', 'min', 'max', 'abs', 'all', 'any',
      'enumerate', 'zip', 'open', 'input', 'sorted', 'map', 'filter'
    ],
    snippets: [
      {
        label: 'def',
        documentation: 'Function definition',
        insertText: 'def ${1:function_name}(${2:args}):\n\t${0:pass}'
      },
      {
        label: 'if',
        documentation: 'If statement',
        insertText: 'if ${1:condition}:\n\t${0:pass}'
      },
      {
        label: 'for',
        documentation: 'For loop',
        insertText: 'for ${1:item} in ${2:iterable}:\n\t${0:pass}'
      },
      {
        label: 'class',
        documentation: 'Class definition',
        insertText: 'class ${1:ClassName}:\n\tdef __init__(self, ${2:args}):\n\t\t${0:pass}'
      },
      {
        label: 'import',
        documentation: 'Import statement',
        insertText: 'import ${1:module}'
      },
      {
        label: 'from',
        documentation: 'From import statement',
        insertText: 'from ${1:module} import ${2:name}'
      }
    ]
  },
  cpp: {
    keywords: [
      'auto', 'const', 'class', 'struct', 'enum', 'virtual', 'override', 'public',
      'private', 'protected', 'template', 'typename', 'namespace', 'using', 'friend',
      'inline', 'static', 'void', 'int', 'float', 'double', 'char', 'bool', 'if',
      'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return',
      'new', 'delete', 'try', 'catch', 'throw', 'nullptr', 'this', 'true', 'false'
    ],
    builtins: [
      'std::vector', 'std::string', 'std::map', 'std::set', 'std::cout', 'std::cin',
      'std::endl', 'std::make_shared', 'std::make_unique', 'std::move', 'std::shared_ptr',
      'std::unique_ptr', 'std::function', 'std::optional', 'std::variant'
    ],
    snippets: [
      {
        label: 'main',
        documentation: 'Main function',
        insertText: 'int main(int argc, char* argv[]) {\n\t${0}\n\treturn 0;\n}'
      },
      {
        label: 'class',
        documentation: 'Class definition',
        insertText: 'class ${1:ClassName} {\npublic:\n\t${1:ClassName}();\n\t~${1:ClassName}();\n\nprivate:\n\t${0}\n};'
      },
      {
        label: 'for',
        documentation: 'For loop',
        insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ++${1:i}) {\n\t${0}\n}'
      },
      {
        label: 'template',
        documentation: 'Template definition',
        insertText: 'template <typename ${1:T}>\n${0}'
      },
      {
        label: 'cout',
        documentation: 'std::cout',
        insertText: 'std::cout << ${1} << std::endl;'
      }
    ]
  },
  rust: {
    keywords: [
      'fn', 'let', 'mut', 'if', 'else', 'match', 'loop', 'while', 'for', 'in',
      'return', 'break', 'continue', 'struct', 'enum', 'trait', 'impl', 'mod',
      'use', 'pub', 'crate', 'super', 'self', 'Self', 'const', 'static', 'type',
      'where', 'unsafe', 'async', 'await', 'move', 'ref', 'box'
    ],
    builtins: [
      'println!', 'format!', 'vec!', 'panic!', 'Option', 'Result', 'Some', 'None',
      'Ok', 'Err', 'String', 'Vec', 'Box', 'Rc', 'Arc', 'Clone', 'Copy', 'Debug',
      'Default', 'unwrap', 'expect', 'map', 'filter', 'collect'
    ],
    snippets: [
      {
        label: 'fn',
        documentation: 'Function definition',
        insertText: 'fn ${1:function_name}(${2:args}) -> ${3:ReturnType} {\n\t${0}\n}'
      },
      {
        label: 'struct',
        documentation: 'Struct definition',
        insertText: 'struct ${1:StructName} {\n\t${0}\n}'
      },
      {
        label: 'impl',
        documentation: 'Implementation block',
        insertText: 'impl ${1:TypeName} {\n\t${0}\n}'
      },
      {
        label: 'match',
        documentation: 'Match expression',
        insertText: 'match ${1:expression} {\n\t${2:pattern} => ${3:expression},\n\t_ => ${0},\n}'
      },
      {
        label: 'if',
        documentation: 'If expression',
        insertText: 'if ${1:condition} {\n\t${0}\n}'
      },
      {
        label: 'println',
        documentation: 'println! macro',
        insertText: 'println!("${1:format}", ${2:args});'
      }
    ]
  },
  go: {
    keywords: [
      'func', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import',
      'return', 'defer', 'go', 'select', 'chan', 'map', 'if', 'else', 'switch',
      'case', 'default', 'for', 'range', 'break', 'continue', 'fallthrough', 'goto'
    ],
    builtins: [
      'fmt.Println', 'fmt.Printf', 'fmt.Sprintf', 'len', 'cap', 'make', 'new',
      'append', 'copy', 'close', 'delete', 'panic', 'recover', 'complex', 'real',
      'imag', 'print', 'println'
    ],
    snippets: [
      {
        label: 'func',
        documentation: 'Function definition',
        insertText: 'func ${1:functionName}(${2:args}) ${3:ReturnType} {\n\t${0}\n}'
      },
      {
        label: 'if',
        documentation: 'If statement',
        insertText: 'if ${1:condition} {\n\t${0}\n}'
      },
      {
        label: 'for',
        documentation: 'For loop',
        insertText: 'for ${1:i} := 0; ${1:i} < ${2:count}; ${1:i}++ {\n\t${0}\n}'
      },
      {
        label: 'range',
        documentation: 'For range loop',
        insertText: 'for ${1:_, v} := range ${2:collection} {\n\t${0}\n}'
      },
      {
        label: 'struct',
        documentation: 'Struct definition',
        insertText: 'type ${1:StructName} struct {\n\t${0}\n}'
      },
      {
        label: 'main',
        documentation: 'Main function',
        insertText: 'package main\n\nimport "fmt"\n\nfunc main() {\n\t${0}\n}'
      }
    ]
  },
  php: {
    keywords: [
      'function', 'class', 'interface', 'trait', 'extends', 'implements', 'public',
      'private', 'protected', 'static', 'final', 'abstract', 'const', 'var', 'if',
      'else', 'elseif', 'while', 'do', 'for', 'foreach', 'as', 'switch', 'case',
      'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'new',
      'clone', 'instanceof', 'echo', 'print', 'include', 'require', 'use', 'namespace'
    ],
    builtins: [
      'echo', 'var_dump', 'print_r', 'count', 'isset', 'empty', 'is_array', 'is_string',
      'implode', 'explode', 'str_replace', 'strlen', 'substr', 'array_map', 'array_filter',
      'array_merge', 'json_encode', 'json_decode', 'file_get_contents', 'header'
    ],
    snippets: [
      {
        label: 'php',
        documentation: 'PHP tag',
        insertText: '<?php\n\n${0}'
      },
      {
        label: 'function',
        documentation: 'Function definition',
        insertText: 'function ${1:functionName}(${2:$args}) {\n\t${0}\n}'
      },
      {
        label: 'class',
        documentation: 'Class definition',
        insertText: 'class ${1:ClassName} {\n\tpublic function __construct() {\n\t\t${0}\n\t}\n}'
      },
      {
        label: 'if',
        documentation: 'If statement',
        insertText: 'if (${1:condition}) {\n\t${0}\n}'
      },
      {
        label: 'foreach',
        documentation: 'Foreach loop',
        insertText: 'foreach (${1:$variable} as ${2:$key} => ${3:$value}) {\n\t${0}\n}'
      },
      {
        label: 'echo',
        documentation: 'Echo statement',
        insertText: 'echo ${1:string};'
      }
    ]
  },
  java: {
    keywords: [
      'class', 'interface', 'enum', 'extends', 'implements', 'public', 'private',
      'protected', 'static', 'final', 'abstract', 'synchronized', 'volatile', 'transient',
      'native', 'strictfp', 'void', 'int', 'boolean', 'char', 'byte', 'short', 'long',
      'float', 'double', 'if', 'else', 'switch', 'case', 'default', 'while', 'do',
      'for', 'break', 'continue', 'return', 'try', 'catch', 'finally', 'throw', 'throws',
      'new', 'this', 'super', 'instanceof', 'package', 'import', 'assert'
    ],
    builtins: [
      'System.out.println', 'String', 'Integer', 'Boolean', 'Double', 'List', 'Map',
      'Set', 'ArrayList', 'HashMap', 'HashSet', 'Collections', 'Arrays', 'Math',
      'Object', 'Thread', 'Runnable', 'Exception', 'Override', 'Deprecated'
    ],
    snippets: [
      {
        label: 'main',
        documentation: 'Main method',
        insertText: 'public static void main(String[] args) {\n\t${0}\n}'
      },
      {
        label: 'sout',
        documentation: 'Print to stdout',
        insertText: 'System.out.println(${1});'
      },
      {
        label: 'class',
        documentation: 'Class definition',
        insertText: 'public class ${1:ClassName} {\n\t${0}\n}'
      },
      {
        label: 'method',
        documentation: 'Method definition',
        insertText: 'public ${1:void} ${2:methodName}(${3:args}) {\n\t${0}\n}'
      },
      {
        label: 'if',
        documentation: 'If statement',
        insertText: 'if (${1:condition}) {\n\t${0}\n}'
      },
      {
        label: 'for',
        documentation: 'For loop',
        insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n\t${0}\n}'
      }
    ]
  }
};
