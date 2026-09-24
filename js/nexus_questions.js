// ==========================================================
// EL NEXUS
// Banco dinámico de reactivos de los siete mundos matemáticos
// js/nexus_questions.js
// ==========================================================

export const NEXUS_AREAS = [
    { id: 'logica',     nombre: 'Salida Lógica',            icono: '🧠' },
    { id: 'numeracion', nombre: 'ArqueoMat',                icono: '🏺' },
    { id: 'reales',     nombre: 'Operación Hackers',        icono: '💻' },
    { id: 'fracciones', nombre: 'Alquimia Matemática',      icono: '⚗️' },
    { id: 'potencias',  nombre: 'Navegantes del Abismo',    icono: '🏴‍☠️' },
    { id: 'medicion',   nombre: 'Horizonte Cósmico',        icono: '🚀' },
    { id: 'jerarquia',  nombre: 'Guardianes del Orden',     icono: '🗿' }
];


// ==========================================================
// UTILIDADES GENERALES
// ==========================================================

function entero(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function elegir(array) {
    return array[entero(0, array.length - 1)];
}

function mezclar(array) {
    return [...array].sort(() => Math.random() - 0.5);
}

function mcd(a, b) {
    return b === 0 ? Math.abs(a) : mcd(b, a % b);
}

function mcm(a, b) {
    return Math.abs(a * b) / mcd(a, b);
}

function simplificarFraccion(numerador, denominador) {
    const divisor = mcd(numerador, denominador);

    return [
        numerador / divisor,
        denominador / divisor
    ];
}

function fraccionTexto(numerador, denominador) {

    const [n, d] = simplificarFraccion(
        numerador,
        denominador
    );

    if (d === 1) {
        return `${n}`;
    }

    return `${n}/${d}`;
}


// ----------------------------------------------------------
// Construye el objeto que espera nexus.js
// ----------------------------------------------------------

function crearReactivoBase(
    area,
    tipo,
    pregunta,
    respuestaCorrecta,
    opciones = null
) {

    const reactivo = {
        areaNombre: area.nombre,
        areaIcono: area.icono,
        tipo: tipo,
        pregunta: pregunta,
        respuestaCorrecta: String(respuestaCorrecta)
    };

    if (opciones) {
        reactivo.opciones = mezclar(
            [...new Set(opciones.map(String))]
        );
    }

    return reactivo;
}


// ----------------------------------------------------------
// Generador de distractores numéricos
// ----------------------------------------------------------

function opcionesNumericas(correcta, candidatos) {

    const respuesta = String(correcta);

    const opciones = [
        respuesta,
        ...candidatos.map(String)
    ];

    const unicas = [...new Set(opciones)];

    let incremento = 1;

    while (unicas.length < 4) {

        const nueva = String(
            Number(correcta) + incremento
        );

        if (!unicas.includes(nueva)) {
            unicas.push(nueva);
        }

        incremento++;
    }

    return unicas.slice(0, 4);
}


// ==========================================================
// GENERADOR GENERAL DEL NEXUS
// ==========================================================

export function generarPoolNexus(totalDeseado = 21) {

    const pool = [];

    /*
        El reparto cíclico garantiza:

        14 reactivos = 2 por mundo
        21 reactivos = 3 por mundo
        35 reactivos = 5 por mundo
    */

    for (let i = 0; i < totalDeseado; i++) {

        const area =
            NEXUS_AREAS[i % NEXUS_AREAS.length];

        const reactivo =
            crearReactivoAleatorioPorArea(area);

        pool.push(reactivo);
    }

    return mezclar(pool);
}


// ==========================================================
// DISTRIBUIDOR POR MUNDO
// ==========================================================

function crearReactivoAleatorioPorArea(area) {

    switch (area.id) {

        case 'logica':
            return crearReactivoLogica(area);

        case 'numeracion':
            return crearReactivoNumeracion(area);

        case 'reales':
            return crearReactivoReales(area);

        case 'fracciones':
            return crearReactivoFracciones(area);

        case 'potencias':
            return crearReactivoPotencias(area);

        case 'medicion':
            return crearReactivoMedicion(area);

        case 'jerarquia':
            return crearReactivoJerarquia(area);

        default:
            throw new Error(
                `Área Nexus desconocida: ${area.id}`
            );
    }
}


// ----------------------------------------------------------
// Mecánica heredada de Salida Lógica:
// Tabla de verdad interactiva
// ----------------------------------------------------------

function generarExpresionLogica(numVars) {

    if (numVars === 2) {

        const vars = ['A', 'B'];

        const partes = vars.map(v =>
            Math.random() < 0.5 ? `${v}'` : v
        );

        const operador =
            Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

        return partes.join(operador);
    }


    // 3 variables
    const patron = entero(0, 2);


    // A ∧ B' ∨ C
    if (patron === 0) {

        const vars = ['A', 'B', 'C'];

        const partes = vars.map(v =>
            Math.random() < 0.5 ? `${v}'` : v
        );

        const op1 =
            Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

        const op2 =
            Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

        return `${partes[0]}${op1}${partes[1]}${op2}${partes[2]}`;
    }


    // (A ∧ B') ∨ C
    if (patron === 1) {

        const a =
            Math.random() < 0.5 ? "A'" : "A";

        const b =
            Math.random() < 0.5 ? "B'" : "B";

        const c =
            Math.random() < 0.5 ? "C'" : "C";

        const opInterno =
            Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

        const opExterno =
            Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

        return `(${a}${opInterno}${b})${opExterno}${c}`;
    }


    // (A ∧ B) ∨ (A' ∧ C)
    const a1 =
        Math.random() < 0.5 ? "A'" : "A";

    const b1 =
        Math.random() < 0.5 ? "B'" : "B";

    const a2 =
        Math.random() < 0.5 ? "A'" : "A";

    const c2 =
        Math.random() < 0.5 ? "C'" : "C";

    const op1 =
        Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

    const op2 =
        Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

    const opPrincipal =
        Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

    return `(${a1}${op1}${b1})${opPrincipal}(${a2}${op2}${c2})`;
}


function generarFilasTablaVerdad(numVars) {

    const totalFilas = 2 ** numVars;
    const filas = [];

    for (let i = 0; i < totalFilas; i++) {

        const fila = {};

        if (numVars === 2) {

            fila.A = i >= 2;
            fila.B = i % 2 !== 0;

        } else {

            fila.A = i >= 4;
            fila.B = Math.floor(i / 2) % 2 !== 0;
            fila.C = i % 2 !== 0;

        }

        filas.push(fila);
    }

    return filas;
}


function evaluarExpresionLogica(expresion, valores) {

    let evaluable = expresion
        .replace(/A'/g, '!a')
        .replace(/A/g, 'a')
        .replace(/B'/g, '!b')
        .replace(/B/g, 'b')
        .replace(/C'/g, '!c')
        .replace(/C/g, 'c')
        .replace(/∧/g, '&&')
        .replace(/∨/g, '||');

    const a = valores.A;
    const b = valores.B;
    const c = valores.C ?? false;

    try {

        return Boolean(
            Function(
                'a',
                'b',
                'c',
                `return ${evaluable};`
            )(a, b, c)
        );

    } catch (error) {

        console.error(
            'Error evaluando expresión lógica:',
            expresion,
            error
        );

        return false;
    }
}


function crearReactivoTablaVerdad(area) {

    // 70 %: 2 variables
    // 30 %: 3 variables
    const numVars =
        Math.random() < 0.70 ? 2 : 3;

    const expresion =
        generarExpresionLogica(numVars);

    const filas =
        generarFilasTablaVerdad(numVars);

    const respuestaCorrecta =
        filas.map(fila =>
            evaluarExpresionLogica(
                expresion,
                fila
            )
        );


    return {

        areaNombre: area.nombre,
        areaIcono: area.icono,

        tipo: 'tabla_verdad',

        pregunta:
            `Configura la columna de resultado para la expresión <strong>${expresion}</strong>.`,

        expresion: expresion,

        numVariables: numVars,

        variables:
            numVars === 2
                ? ['A', 'B']
                : ['A', 'B', 'C'],

        filas: filas,

        // IMPORTANTE:
        // aquí conservamos booleanos, no String()
        respuestaCorrecta: respuestaCorrecta
    };
}

// ==========================================================
// 1. SALIDA LÓGICA
// Lógica matemática
// ==========================================================

function crearReactivoLogica(area) {
    //  return crearReactivoTablaVerdad(area);
    const tipo = entero(1, 5);

    // ------------------------------------------------------
    // Tabla de verdad interactiva
    // Mecánica heredada de Salida Lógica
    // ------------------------------------------------------

    if (tipo === 5) {
        return crearReactivoTablaVerdad(area);
    }

    // ------------------------------------------------------
    // Conjunción / disyunción
    // ------------------------------------------------------

    if (tipo === 1) {

        const casos = [

            [
                'P = Verdadero y Q = Verdadero',
                'P \\land Q',
                'Verdadero'
            ],

            [
                'P = Verdadero y Q = Falso',
                'P \\land Q',
                'Falso'
            ],

            [
                'P = Falso y Q = Verdadero',
                'P \\lor Q',
                'Verdadero'
            ],

            [
                'P = Falso y Q = Falso',
                'P \\lor Q',
                'Falso'
            ]
        ];

        const caso = elegir(casos);

        return crearReactivoBase(
            area,
            'verdadero_falso',
            `Si ${caso[0]}, ¿cuál es el valor de verdad de $${caso[1]}$?`,
            caso[2],
            ['Verdadero', 'Falso']
        );
    }


    // ------------------------------------------------------
    // Negación
    // ------------------------------------------------------

    if (tipo === 2) {

        const valor = elegir([
            'Verdadero',
            'Falso'
        ]);

        const respuesta =
            valor === 'Verdadero'
                ? 'Falso'
                : 'Verdadero';

        return crearReactivoBase(
            area,
            'verdadero_falso',
            `Si la proposición $P$ es <strong>${valor}</strong>, determina el valor de $\\neg P$.`,
            respuesta,
            ['Verdadero', 'Falso']
        );
    }


    // ------------------------------------------------------
    // Interpretación de símbolos
    // ------------------------------------------------------

    if (tipo === 3) {

        const casos = [

            [
                '$P \\land Q$',
                'P y Q'
            ],

            [
                '$P \\lor Q$',
                'P o Q'
            ],

            [
                '$\\neg P$',
                'no P'
            ]
        ];

        const caso = elegir(casos);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `¿Cuál expresión verbal representa ${caso[0]}?`,
            caso[1],
            [
                caso[1],
                'P entonces Q',
                'P si y solo si Q',
                'P o no Q'
            ]
        );
    }

    


    // ------------------------------------------------------
    // Expresión combinada
    // ------------------------------------------------------

    const p = entero(0, 1);
    const q = entero(0, 1);

    const resultado = (!p || !!q);

    return crearReactivoBase(
        area,
        'verdadero_falso',
        `Sean $P=${p ? 'V' : 'F'}$ y $Q=${q ? 'V' : 'F'}$. Determina el valor de $\\neg P \\lor Q$.`,
        resultado ? 'Verdadero' : 'Falso',
        ['Verdadero', 'Falso']
    );
}


// ==========================================================
// 2. ARQUEOMAT
// Sistemas de numeración
// ==========================================================

// ----------------------------------------------------------
// Mecánica heredada de ArqueoMat:
// Descifrado de sistemas de numeración antiguos
// ----------------------------------------------------------

function generarNumeroAntiguo(sistema) {

    /*
        Los rangos están deliberadamente limitados
        para conservar el ritmo de El Nexus.

        No buscamos reproducir los cinco niveles
        completos de ArqueoMat.
    */

    switch (sistema) {

        case 'egipcia':
            return entero(10, 999);

        case 'mesopotamica':
            return entero(10, 359);

        case 'maya':
            return entero(10, 399);

        default:
            return entero(10, 99);
    }
}


function nombreSistemaAntiguo(sistema) {

    switch (sistema) {

        case 'egipcia':
            return 'EGIPCIO';

        case 'mesopotamica':
            return 'MESOPOTÁMICO';

        case 'maya':
            return 'MAYA';

        default:
            return 'ANTIGUO';
    }
}


function crearReactivoNumeroAntiguo(area) {

    const sistemas = [
        'egipcia',
        'mesopotamica',
        'maya'
    ];

    const sistema = elegir(sistemas);
    const numero =
        generarNumeroAntiguo(sistema);

    // ==========================================
    // PRUEBA TEMPORAL MAYA CON CERO
    // ==========================================

    //const sistema = 'maya';
    //const numero = 401;

    /*
        La mecánica original de ArqueoMat permite
        opción múltiple y respuesta directa.

        Conservamos ambos formatos.
    */

    const modoRespuesta =
        Math.random() < 0.65
            ? 'opcion_multiple'
            : 'consola';


    const reactivo = {

        areaNombre: area.nombre,
        areaIcono: area.icono,

        tipo: 'numero_antiguo',

        sistema: sistema,

        sistemaNombre:
            nombreSistemaAntiguo(sistema),

        numero: numero,

        modoRespuesta: modoRespuesta,

        pregunta:
            `Descifra la representación del sistema <strong>${nombreSistemaAntiguo(sistema)}</strong> y determina su valor decimal.`,

        respuestaCorrecta:
            String(numero)
    };


    // ------------------------------------------------------
    // Opción múltiple
    // ------------------------------------------------------

    if (modoRespuesta === 'opcion_multiple') {

        let paso = 1;

        if (numero >= 100) {
            paso = 10;
        }


        // ------------------------------------------
        // Generar posibles distractores
        // ------------------------------------------

        const candidatos = [
            numero - paso,
            numero + paso,
            numero - paso * 2,
            numero + paso * 2,
            numero - paso * 5,
            numero + paso * 5
        ]
        .filter(valor =>
            valor > 0 &&
            valor !== numero
        );


        // Eliminar posibles duplicados
        const distractoresUnicos =
            [...new Set(candidatos)];


        // Mezclar distractores y tomar solamente 3
        let distractores =
            mezclar(
                distractoresUnicos.map(String)
            ).slice(0, 3);


        // ------------------------------------------
        // Protección:
        // garantizar siempre 3 distractores
        // ------------------------------------------

        let incremento = paso;

        while (distractores.length < 3) {

            const candidato =
                String(numero + incremento);

            if (
                candidato !== String(numero) &&
                !distractores.includes(candidato)
            ) {
                distractores.push(candidato);
            }

            incremento += paso;
        }


        // ------------------------------------------
        // AHORA agregamos la respuesta correcta
        // ------------------------------------------

        reactivo.opciones = mezclar([
            String(numero),
            ...distractores
        ]);
    }


    return reactivo;
}


function crearReactivoNumeracion(area) {
    //return crearReactivoNumeroAntiguo(area);
    const tipo = entero(1, 5);

    // ------------------------------------------------------
    // Representación de sistema antiguo
    // Mecánica heredada de ArqueoMat
    // ------------------------------------------------------

    if (tipo === 5) {

        return crearReactivoNumeroAntiguo(area);
    }

    const romanos = [

        [4, 'IV'],
        [6, 'VI'],
        [9, 'IX'],
        [12, 'XII'],
        [14, 'XIV'],
        [18, 'XVIII'],
        [20, 'XX'],
        [24, 'XXIV'],
        [29, 'XXIX'],
        [35, 'XXXV'],
        [40, 'XL'],
        [49, 'XLIX']

    ];


    // ------------------------------------------------------
    // Romano → decimal
    // ------------------------------------------------------

    if (tipo === 1) {

        const [numero, romano] =
            elegir(romanos);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `¿Qué valor decimal representa el número romano <strong>${romano}</strong>?`,
            numero,
            opcionesNumericas(
                numero,
                [
                    numero - 1,
                    numero + 1,
                    numero + 10
                ]
            )
        );
    }


    // ------------------------------------------------------
    // Decimal → romano
    // ------------------------------------------------------

    if (tipo === 2) {

        const [numero, romano] =
            elegir(romanos);

        const distractores =
            mezclar(
                romanos.filter(
                    elemento =>
                        elemento[1] !== romano
                )
            )
            .slice(0, 3)
            .map(elemento => elemento[1]);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `¿Cómo se escribe $${numero}$ en números romanos?`,
            romano,
            [
                romano,
                ...distractores
            ]
        );
    }


    // ------------------------------------------------------
    // Sistema vigesimal
    // ------------------------------------------------------

    if (tipo === 3) {

        const unidades = entero(0, 19);
        const veintenas = entero(1, 4);

        const resultado =
            unidades +
            veintenas * 20;

        return crearReactivoBase(
            area,
            'consola',
            `En un sistema vigesimal, un número tiene $${veintenas}$ veintenas y $${unidades}$ unidades. ¿Cuál es su valor decimal?`,
            resultado
        );
    }

    


    // ------------------------------------------------------
    // Concepto de base
    // ------------------------------------------------------

    const base = elegir([
        2,
        5,
        10,
        20
    ]);

    return crearReactivoBase(
        area,
        'opcion_multiple',
        `Un sistema de numeración de base $${base}$ utiliza valores posicionales que son potencias de:`,
        base,
        opcionesNumericas(
            base,
            [2, 5, 10, 20]
        )
    );
}


// ==========================================================
// 3. OPERACIÓN HACKERS
// Números reales
// ==========================================================

// ----------------------------------------------------------
// Reactivo especial: cápsula de clasificación
// Heredado de Operación Hackers
// ----------------------------------------------------------

function crearReactivoClasificacionReal(area) {

    const casos = [

        {
            valor: '-8',
            categoria: 'Enteros'
        },

        {
            valor: '15',
            categoria: 'Enteros'
        },

        {
            valor: '0',
            categoria: 'Enteros'
        },

        {
            valor: '-43',
            categoria: 'Enteros'
        },

        {
            valor: '\\frac{3}{4}',
            categoria: 'Racionales'
        },

        {
            valor: '-0.25',
            categoria: 'Racionales'
        },

        {
            valor: '\\frac{11}{16}',
            categoria: 'Racionales'
        },

        {
            valor: '-\\frac{5}{2}',
            categoria: 'Racionales'
        },

        {
            valor: '1.38',
            categoria: 'Racionales'
        },

        {
            valor: '\\pi',
            categoria: 'Irracionales'
        },

        {
            valor: '\\sqrt{2}',
            categoria: 'Irracionales'
        },

        {
            valor: '\\sqrt{17}',
            categoria: 'Irracionales'
        },

        {
            valor: 'e',
            categoria: 'Irracionales'
        }

    ];


    const caso = elegir(casos);


    return {

        areaNombre: area.nombre,
        areaIcono: area.icono,

        tipo: 'clasificacion_real',

        pregunta:
            `📡 <strong>PUERTO DE RED:</strong>
            Deposita la cápsula de datos en el
            contenedor correspondiente.`,

        valor: caso.valor,

        categorias: [
            'Enteros',
            'Racionales',
            'Irracionales'
        ],

        respuestaCorrecta:
            caso.categoria

    };
}

// ----------------------------------------------------------
// Reactivo especial: panel de cables
// Operación Hackers
// ----------------------------------------------------------

function crearReactivoCablesHackers(area) {

    const bancos = [

        // ==================================================
        // PROPIEDADES DE LAS OPERACIONES
        // ==================================================
        {
            titulo: 'PROPIEDADES ARITMÉTICAS',

            pares: [
                {
                    izquierda: 'Conmutativa',
                    derecha: 'a + b = b + a'
                },
                {
                    izquierda: 'Asociativa',
                    derecha: '(a + b) + c = a + (b + c)'
                },
                {
                    izquierda: 'Distributiva',
                    derecha: 'a(b + c) = ab + ac'
                },
                {
                    izquierda: 'Cerradura',
                    derecha: 'a, b ∈ ℤ → a + b ∈ ℤ'
                }
            ]
        },


        // ==================================================
        // NEUTROS E INVERSOS
        // ==================================================
        {
            titulo: 'NEUTROS E INVERSOS',

            pares: [
                {
                    izquierda: 'Neutro aditivo',
                    derecha: 'a + 0 = a'
                },
                {
                    izquierda: 'Neutro multiplicativo',
                    derecha: 'a · 1 = a'
                },
                {
                    izquierda: 'Inverso aditivo',
                    derecha: 'a + (-a) = 0'
                },
                {
                    izquierda: 'Inverso multiplicativo',
                    derecha: 'a · (1/a) = 1'
                }
            ]
        },


        // ==================================================
        // OPERACIONES INVERSAS
        // ==================================================
        {
            titulo: 'OPERACIONES INVERSAS',

            pares: [
                {
                    izquierda: 'Suma',
                    derecha: 'Resta'
                },
                {
                    izquierda: 'Multiplicación',
                    derecha: 'División'
                },
                {
                    izquierda: 'Potenciación',
                    derecha: 'Radicación'
                },
                {
                    izquierda: '+8',
                    derecha: '-8'
                }
            ]
        }

    ];


    const banco = elegir(bancos);


    return {

        areaNombre: area.nombre,
        areaIcono: area.icono,

        tipo: 'cables_hackers',

        pregunta:
            `⚡ <strong>${banco.titulo}</strong><br>
            Conecta cada elemento de la izquierda
            con su relación correcta.`,

        pares: banco.pares.map(
            (par, index) => ({
                id: `cable_${index}`,
                izquierda: par.izquierda,
                derecha: par.derecha
            })
        ),

        respuestaCorrecta: 'panel_completo'

    };
}

// ----------------------------------------------------------
// Reactivo especial: árbol de factorización
// Operación Hackers
// ----------------------------------------------------------

function crearReactivoArbolFactorizacion(area) {

    const casos = [

        { numero: 12, factores: [3, 4] },
        { numero: 18, factores: [3, 6] },
        { numero: 20, factores: [4, 5] },
        { numero: 24, factores: [4, 6] },
        { numero: 28, factores: [4, 7] },
        { numero: 30, factores: [5, 6] },
        { numero: 32, factores: [4, 8] },
        { numero: 36, factores: [6, 6] },
        { numero: 40, factores: [5, 8] },
        { numero: 42, factores: [6, 7] },
        { numero: 45, factores: [5, 9] },
        { numero: 48, factores: [6, 8] },
        { numero: 54, factores: [6, 9] },
        { numero: 56, factores: [7, 8] },
        { numero: 60, factores: [6, 10] }

    ];


    const caso = elegir(casos);


    return {

        areaNombre: area.nombre,
        areaIcono: area.icono,

        tipo: 'arbol_factorizacion',

        pregunta:
            `🌳 <strong>ÁRBOL DE FACTORIZACIÓN</strong><br>
            Completa las ramas con dos factores cuyo
            producto sea ${caso.numero}.`,

        numero: caso.numero,

        factoresCorrectos: caso.factores,

        respuestaCorrecta: 'arbol_correcto'
    };
}


function crearReactivoReales(area) {

    // ==========================================
    // PRUEBA TEMPORAL
    // FORZAR CÁPSULA DE CLASIFICACIÓN
    // ==========================================

    //return crearReactivoArbolFactorizacion(area);

    const tipo = entero(1, 9);
    //const tipo = 9;
    // ------------------------------------------------------
    // Cápsula interactiva de clasificación
    // ------------------------------------------------------

    if (tipo === 5) {
        return crearReactivoClasificacionReal(area);
    }   
    
    if (tipo === 6) {
        return crearReactivoCablesHackers(area);
    }

    if (tipo === 7) {
        return crearReactivoArbolFactorizacion(area);
    }

    // ------------------------------------------------------
    // Máximo Común Divisor
    // ------------------------------------------------------

    if (tipo === 8) {

        const casosMCD = [
            [12, 18],
            [16, 24],
            [18, 30],
            [20, 30],
            [24, 36],
            [28, 42],
            [32, 48],
            [36, 54],
            [40, 60],
            [45, 60]
        ];

        const [a, b] = elegir(casosMCD);

        const resultado = mcd(a, b);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `📡 <strong>PROTOCOLO DE SINCRONIZACIÓN</strong><br>
            Calcula el Máximo Común Divisor:<br>
            $\\operatorname{MCD}(${a}, ${b})$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    resultado * 2,
                    Math.max(1, resultado - 1),
                    resultado + 2
                ]
            )
        );
    }


    // ------------------------------------------------------
    // Mínimo Común Múltiplo
    // ------------------------------------------------------

    if (tipo === 9) {

        const casosMCM = [
            [4, 6],
            [6, 8],
            [6, 9],
            [8, 12],
            [10, 15],
            [12, 18],
            [14, 21],
            [15, 20],
            [16, 24],
            [18, 24]
        ];

        const [a, b] = elegir(casosMCM);

        const resultado = mcm(a, b);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `📡 <strong>SINCRONIZADOR DE FRECUENCIAS</strong><br>
            Calcula el Mínimo Común Múltiplo:<br>
            $\\operatorname{mcm}(${a}, ${b})$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    resultado / 2,
                    resultado + a,
                    resultado + b
                ]
            )
        );
    }

    // ------------------------------------------------------
    // Clasificación
    // ------------------------------------------------------

    if (tipo === 1) {

        const casos = [

            ['$-8$', 'Entero'],

            ['$\\frac{3}{5}$', 'Racional'],

            ['$\\sqrt{2}$', 'Irracional'],

            ['$\\pi$', 'Irracional'],

            ['$7$', 'Natural'],

            [
                '$-\\frac{11}{4}$',
                'Racional'
            ]
        ];

        const [numero, respuesta] =
            elegir(casos);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `¿Cuál es el conjunto <strong>más específico</strong> al que pertenece ${numero}?`,
            respuesta,
            [
                'Natural',
                'Entero',
                'Racional',
                'Irracional'
            ]
        );
    }


    // ------------------------------------------------------
    // Suma de números con signo
    // ------------------------------------------------------

    if (tipo === 2) {

        const a = entero(-12, 12);
        const b = entero(-12, 12);

        const resultado = a + b;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Resuelve: $(${a}) + (${b})$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    a - b,
                    -resultado,
                    resultado + 2
                ]
            )
        );
    }


    // ------------------------------------------------------
    // Multiplicación con signo
    // ------------------------------------------------------

    if (tipo === 3) {

        let a = entero(-9, 9);
        let b = entero(-9, 9);

        if (a === 0) a = 3;
        if (b === 0) b = -2;

        const resultado = a * b;

        return crearReactivoBase(
            area,
            'consola',
            `Calcula: $(${a})(${b})$`,
            resultado
        );
    }


    // ------------------------------------------------------
    // Irracionales
    // ------------------------------------------------------

    const numero = elegir([
        2,
        3,
        5,
        6,
        7,
        10,
        11,
        13
    ]);

    return crearReactivoBase(
        area,
        'verdadero_falso',
        `La expresión $\\sqrt{${numero}}$ representa un número irracional.`,
        'Verdadero',
        ['Verdadero', 'Falso']
    );
}


// ==========================================================
// 4. ALQUIMIA MATEMÁTICA
// Fracciones, proporciones y porcentajes
// ==========================================================

function crearReactivoFracciones(area) {

    const tipo = entero(1, 9);
    //const tipo = 9;

    let a = entero(1, 8);
    let b = entero(2, 9);
    let c = entero(1, 8);
    let d = entero(2, 9);

    if (a >= b) {
        a = entero(1, b - 1);
    }

    if (c >= d) {
        c = entero(1, d - 1);
    }


    // ------------------------------------------------------
    // Suma
    // ------------------------------------------------------

    if (tipo === 1) {

        const respuesta =
            fraccionTexto(
                a * d + c * b,
                b * d
            );

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Resuelve: $\\frac{${a}}{${b}} + \\frac{${c}}{${d}}$`,
            respuesta,
            [
                respuesta,

                fraccionTexto(
                    a + c,
                    b + d
                ),

                fraccionTexto(
                    a + c,
                    b * d
                ),

                fraccionTexto(
                    a * d + c * d,
                    b * d
                )
            ]
        );
    }


    // ------------------------------------------------------
    // Multiplicación
    // ------------------------------------------------------

    if (tipo === 2) {

        const respuesta =
            fraccionTexto(
                a * c,
                b * d
            );

        return crearReactivoBase(
            area,
            'consola',
            `Multiplica y simplifica: $\\frac{${a}}{${b}} \\times \\frac{${c}}{${d}}$. Escribe tu respuesta como a/b.`,
            respuesta
        );
    }


    // ------------------------------------------------------
    // División
    // ------------------------------------------------------

    if (tipo === 3) {

        const respuesta =
            fraccionTexto(
                a * d,
                b * c
            );

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Resuelve: $\\frac{${a}}{${b}} \\div \\frac{${c}}{${d}}$`,
            respuesta,
            [
                respuesta,

                fraccionTexto(
                    a * c,
                    b * d
                ),

                fraccionTexto(
                    a * d + c * b,
                    b * d
                ),

                fraccionTexto(
                    a * d,
                    b * d
                )
            ]
        );
    }

    if (tipo === 4) {

        const factor = entero(2, 5);

        return crearReactivoBase(
            area,
            'verdadero_falso',
            `Las fracciones $\\frac{${a}}{${b}}$ y $\\frac{${a * factor}}{${b * factor}}$ son equivalentes.`,
            'Verdadero',
            ['Verdadero', 'Falso']
        );
    }


    // ------------------------------------------------------
    // Entero → fracción
    // ------------------------------------------------------

    if (tipo === 5) {

        const enteroBase = entero(2, 8);
        const denominador = entero(2, 6);

        const numerador =
            enteroBase * denominador;

        const respuesta =
            `${numerador}/${denominador}`;

        const opciones = [
            respuesta,
            `${enteroBase}/${denominador}`,
            `${numerador + enteroBase}/${denominador}`,
            `${numerador}/${denominador + 1}`
        ];

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `⚗️ <strong>CRISTALIZACIÓN UNIFORME</strong><br>
            El número entero $${enteroBase}$ debe expresarse como una fracción
            con denominador $${denominador}$. ¿Cuál es la representación correcta?`,
            respuesta,
            opciones
        );
    }   

    // ------------------------------------------------------
    // Simplificación de fracciones
    // ------------------------------------------------------

    if (tipo === 6) {

        let numeradorBase = entero(1, 6);
        let denominadorBase = entero(2, 8);

        while (
            numeradorBase >= denominadorBase ||
            mcd(numeradorBase, denominadorBase) !== 1
        ) {
            numeradorBase = entero(1, 6);
            denominadorBase = entero(2, 8);
        }

        const factor = entero(2, 6);

        const numerador =
            numeradorBase * factor;

        const denominador =
            denominadorBase * factor;

        const respuesta =
            `${numeradorBase}/${denominadorBase}`;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🧪 <strong>DESTILACIÓN PURA</strong><br>
            Simplifica la fracción
            $\\frac{${numerador}}{${denominador}}$
            hasta obtener su forma irreducible.`,
            respuesta,
            [
                respuesta,
                `${numerador}/${denominador}`,
                `${numeradorBase + 1}/${denominadorBase}`,
                `${numeradorBase}/${denominadorBase + 1}`
            ]
        );
    }

    // ------------------------------------------------------
    // Proporción directa
    // ------------------------------------------------------

    if (tipo === 7) {

        const cantidadInicial = entero(2, 6);
        const recursoInicial = entero(2, 8);
        const factor = entero(2, 4);

        const cantidadFinal =
            cantidadInicial * factor;

        const respuesta =
            recursoInicial * factor;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `📜 <strong>ESCALADO DE RECETA</strong><br>
            Si $${cantidadInicial}$ pociones requieren
            $${recursoInicial}$ gramos de polvo alquímico,
            ¿cuántos gramos se requieren para
            $${cantidadFinal}$ pociones?`,
            respuesta,
            opcionesNumericas(
                respuesta,
                [
                    recursoInicial + factor,
                    respuesta - recursoInicial,
                    respuesta + recursoInicial
                ]
            )
        );
    }

    // ------------------------------------------------------
    // Proporción inversa
    // ------------------------------------------------------

    if (tipo === 8) {

        const alquimistasIniciales =
            elegir([2, 3, 4]);

        const factor =
            entero(2, 3);

        const alquimistasFinales =
            alquimistasIniciales * factor;

        const tiempoFinal =
            entero(2, 6);

        const tiempoInicial =
            tiempoFinal * factor;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `⏳ <strong>TRABAJO EN EQUIPO</strong><br>
            $${alquimistasIniciales}$ alquimistas tardan
            $${tiempoInicial}$ horas en preparar un elixir.
            Si trabajan $${alquimistasFinales}$ alquimistas
            al mismo ritmo, ¿cuántas horas tardarán?`,
            tiempoFinal,
            opcionesNumericas(
                tiempoFinal,
                [
                    tiempoInicial,
                    tiempoFinal + factor,
                    tiempoFinal * 2
                ]
            )
        );
    }

    // ------------------------------------------------------
    // Porcentaje
    // ------------------------------------------------------

    if (tipo === 9) {

        const porcentaje =
            elegir([10, 20, 25, 30, 40, 50, 75]);

        const total =
            elegir([40, 60, 80, 100, 120, 160, 200]);

        const respuesta =
            (porcentaje * total) / 100;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🔮 <strong>CONCENTRACIÓN DE MAGIA</strong><br>
            Una esencia contiene $${total}$ ml.
            ¿Cuántos mililitros representan el
            $${porcentaje}\\%$ de esa cantidad?`,
            respuesta,
            opcionesNumericas(
                respuesta,
                [
                    total - respuesta,
                    respuesta + 10,
                    Math.max(1, respuesta - 10)
                ]
            )
        );
    }

    // ------------------------------------------------------
    // Equivalencia
    // ------------------------------------------------------

    //const factor = entero(2, 5);

    //return crearReactivoBase(
    //    area,
    //    'verdadero_falso',
    //    `Las fracciones $\\frac{${a}}{${b}}$ y $\\frac{${a * factor}}{${b * factor}}$ son equivalentes.`,
    //    'Verdadero',
    //    ['Verdadero', 'Falso']
    //);
}


// ==========================================================
// 5. NAVEGANTES DEL ABISMO
// Exponentes y radicales
// ==========================================================

function crearReactivoPotencias(area) {

    const tipo = entero(1, 10);
    //const tipo = 9;


    // ------------------------------------------------------
    // Potencia simple
    // ------------------------------------------------------

    if (tipo === 1) {

        const base = entero(2, 5);
        const exponente = entero(2, 4);

        const resultado =
            base ** exponente;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Calcula: $${base}^{${exponente}}$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    base * exponente,
                    base + exponente,
                    resultado - base
                ]
            )
        );
    }


    // ------------------------------------------------------
    // Producto de potencias
    // ------------------------------------------------------

    if (tipo === 2) {

        const base = entero(2, 8);
        const m = entero(2, 5);
        const n = entero(1, 4);

        const resultado = m + n;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Simplifica: $${base}^{${m}} \\cdot ${base}^{${n}}$`,
            `$${base}^{${resultado}}$`,
            [
                `$${base}^{${resultado}}$`,
                `$${base}^{${m * n}}$`,
                `$${base}^{${Math.abs(m - n)}}$`,
                `$${base * 2}^{${resultado}}$`
            ]
        );
    }


    // ------------------------------------------------------
    // Cociente de potencias
    // ------------------------------------------------------

    if (tipo === 3) {

        const base = entero(2, 8);
        const m = entero(4, 8);
        const n = entero(1, m - 1);

        const resultado = m - n;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Simplifica: $\\frac{${base}^{${m}}}{${base}^{${n}}}$`,
            `$${base}^{${resultado}}$`,
            [
                `$${base}^{${resultado}}$`,
                `$${base}^{${m + n}}$`,
                `$${base}^{${m * n}}$`,
                `$${base}^{${n}}$`
            ]
        );
    }


    // ------------------------------------------------------
    // Raíz cuadrada
    // ------------------------------------------------------

    if (tipo === 4) {

        const resultado = entero(2, 12);
        const radicando =
            resultado * resultado;

        return crearReactivoBase(
            area,
            'consola',
            `Calcula: $\\sqrt{${radicando}}$`,
            resultado
        );
    }


    // ------------------------------------------------------
    // Raíz cúbica
    // ------------------------------------------------------

    if (tipo === 5) {

        const resultado = entero(2, 7);

        const radicando =
            resultado ** 3;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Calcula: $\\sqrt[3]{${radicando}}$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    resultado + 1,
                    resultado - 1,
                    resultado * 3
                ]
            )
        );
    }

    // ------------------------------------------------------
    // Componentes de una potencia
    // ------------------------------------------------------

    if (tipo === 6) {

        const base = entero(2, 9);
        const exponente = entero(2, 6);

        const preguntarBase =
            Math.random() < 0.5;

        const respuesta =
            preguntarBase ? base : exponente;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            preguntarBase
                ? `⚓ En la potencia $${base}^{${exponente}}$, ¿cuál es la <strong>base</strong>?`
                : `⚓ En la potencia $${base}^{${exponente}}$, ¿cuál es el <strong>exponente</strong>?`,
            respuesta,
            opcionesNumericas(
                respuesta,
                [
                    preguntarBase ? exponente : base,
                    respuesta + 1,
                    Math.max(1, respuesta - 1)
                ]
            )
        );
    }

    // ------------------------------------------------------
    // Potencia de una potencia
    // ------------------------------------------------------

    if (tipo === 7) {

        const base = entero(2, 7);
        const m = entero(2, 5);
        const n = entero(2, 4);

        const resultado =
            m * n;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🏴‍☠️ Simplifica:
            $(${base}^{${m}})^{${n}}$`,
            `$${base}^{${resultado}}$`,
            [
                `$${base}^{${resultado}}$`,
                `$${base}^{${m + n}}$`,
                `$${base}^{${Math.abs(m - n)}}$`,
                `$${base * n}^{${m}}$`
            ]
        );
    }

    // ------------------------------------------------------
    // Exponente negativo
    // ------------------------------------------------------

    if (tipo === 8) {

        const base = entero(2, 6);
        const exponente = entero(1, 3);

        const potencia =
            base ** exponente;

        const respuesta =
            `1/${potencia}`;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🌊 Expresa con exponente positivo:
            $${base}^{-${exponente}}$`,
            respuesta,
            [
                respuesta,
                `${potencia}`,
                `-${potencia}`,
                `1/${base * exponente}`
            ]
        );
    }

    // ------------------------------------------------------
    // Cancelación potencia-raíz
    // ------------------------------------------------------

    if (tipo === 9) {

        const base = entero(2, 7);

        const indice =
            elegir([2, 3, 4]);

        const multiplicador =
            entero(1, 3);

        const exponente =
            indice * multiplicador;

        const exponenteResultado =
            exponente / indice;


        const formatearPotencia = (base, exponente) => {

            if (exponente === 1) {
                return `$${base}$`;
            }

            return `$${base}^{${exponente}}$`;
        };


        const respuesta =
            formatearPotencia(
                base,
                exponenteResultado
            );


        const exponentesDistractores = [];

        let desplazamiento = 1;

        while (exponentesDistractores.length < 3) {

            const candidatos = [
                exponenteResultado + desplazamiento,
                exponenteResultado - desplazamiento
            ];

            for (const candidato of candidatos) {

                if (
                    candidato >= 1 &&
                    candidato !== exponenteResultado &&
                    !exponentesDistractores.includes(candidato)
                ) {
                    exponentesDistractores.push(candidato);
                }

                if (exponentesDistractores.length === 3) {
                    break;
                }
            }

            desplazamiento++;
        }


        const opciones = [
            respuesta,
            ...exponentesDistractores.map(
                exponente =>
                    formatearPotencia(
                        base,
                        exponente
                    )
            )
        ];


        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🗝️ Simplifica:
            $\\sqrt[${indice}]{${base}^{${exponente}}}$`,
            respuesta,
            opciones
        );
    }


}


// ==========================================================
// 6. HORIZONTE CÓSMICO
// Medición
// ==========================================================

function crearReactivoMedicion(area) {

    const tipo = entero(1, 9);
    //const tipo = 9;


    // ------------------------------------------------------
    // Metros → centímetros
    // ------------------------------------------------------

    if (tipo === 1) {

        const metros = entero(2, 25);

        const resultado =
            metros * 100;

        return crearReactivoBase(
            area,
            'consola',
            `Convierte $${metros}\\text{ m}$ a centímetros. Escribe solo el número.`,
            resultado
        );
    }


    // ------------------------------------------------------
    // Kilogramos → gramos
    // ------------------------------------------------------

    if (tipo === 2) {

        const kg = entero(1, 12);

        const resultado =
            kg * 1000;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `¿Cuántos gramos son $${kg}\\text{ kg}$?`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    kg * 100,
                    kg * 10,
                    kg * 10000
                ]
            )
        );
    }


    // ------------------------------------------------------
    // Litros → mililitros
    // ------------------------------------------------------

    if (tipo === 3) {

        const litros = entero(1, 9);

        const resultado =
            litros * 1000;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Convierte $${litros}\\text{ L}$ a mililitros.`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    litros * 100,
                    litros * 10,
                    litros * 10000
                ]
            )
        );
    }


    // ------------------------------------------------------
    // Minutos → segundos
    // ------------------------------------------------------

    if (tipo === 4) {

        const minutos = entero(2, 15);

        const resultado =
            minutos * 60;

        return crearReactivoBase(
            area,
            'consola',
            `Convierte $${minutos}$ minutos a segundos.`,
            resultado
        );
    }

    if (tipo === 5) {
        // ------------------------------------------------------
        // Equivalencia
        // ------------------------------------------------------

        const cm =
            entero(1, 9) * 100;

        return crearReactivoBase(
            area,
            'verdadero_falso',
            `$${cm}\\text{ cm}$ equivalen a $${cm / 100}\\text{ m}$.`,
            'Verdadero',
            ['Verdadero', 'Falso']
        );
    }

    
    // ------------------------------------------------------
    // Unidad fundamental del Sistema Internacional
    // ------------------------------------------------------

    if (tipo === 6) {

        const casos = [
            ['longitud', 'metro (m)', 'kilómetro (km)', 'newton (N)', 'litro (L)'],
            ['masa', 'kilogramo (kg)', 'gramo (g)', 'newton (N)', 'joule (J)'],
            ['tiempo', 'segundo (s)', 'minuto (min)', 'hora (h)', 'watt (W)'],
            ['temperatura', 'kelvin (K)', 'grado Celsius (°C)', 'joule (J)', 'metro (m)']
        ];

        const [
            magnitud,
            respuesta,
            distractor1,
            distractor2,
            distractor3
        ] = elegir(casos);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🛰️ ¿Cuál es la unidad fundamental del Sistema Internacional para la <strong>${magnitud}</strong>?`,
            respuesta,
            [
                respuesta,
                distractor1,
                distractor2,
                distractor3
            ]
        );
    }

    // ------------------------------------------------------
    // Número decimal → notación científica
    // ------------------------------------------------------

    if (tipo === 7) {

        const coeficienteEntero =
            entero(11, 99);

        const coeficiente =
            coeficienteEntero / 10;

        const exponente =
            entero(3, 6);

        const numero =
            coeficiente * (10 ** exponente);

        const respuesta =
            `$${coeficiente} \\times 10^{${exponente}}$`;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🌌 Expresa $${numero}$ en notación científica.`,
            respuesta,
            [
                respuesta,
                `$${coeficiente} \\times 10^{${exponente - 1}}$`,
                `$${coeficiente} \\times 10^{${exponente + 1}}$`,
                `$${coeficienteEntero} \\times 10^{${exponente}}$`
            ]
        );
    }

    // ------------------------------------------------------
    // Simplificación de una razón
    // ------------------------------------------------------

    if (tipo === 8) {

        const a = entero(2, 8);
        const b = entero(2, 8);
        const factor = entero(2, 6);

        const valorA =
            a * factor;

        const valorB =
            b * factor;

        const divisor =
            mcd(valorA, valorB);

        const simplificadoA =
            valorA / divisor;

        const simplificadoB =
            valorB / divisor;

        const respuesta =
            `${simplificadoA}:${simplificadoB}`;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `📡 Simplifica la razón $${valorA}:${valorB}$.`,
            respuesta,
            [
                respuesta,
                `${valorA}:${valorB}`,
                `${simplificadoB}:${simplificadoA}`,
                `${simplificadoA + 1}:${simplificadoB}`
            ]
        );
    }

    // ------------------------------------------------------
    // Escala y proporción
    // ------------------------------------------------------

    if (tipo === 9) {

        const cmMapa =
            entero(2, 8);

        const metrosPorCm =
            elegir([100, 200, 250, 500]);

        const respuesta =
            cmMapa * metrosPorCm;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🗺️ En un mapa estelar, $1\\text{ cm}$ representa $${metrosPorCm}\\text{ m}$. 
            Si dos puntos están separados $${cmMapa}\\text{ cm}$ en el mapa,
            ¿qué distancia real representan en metros?`,
            respuesta,
            opcionesNumericas(
                respuesta,
                [
                    metrosPorCm,
                    respuesta + metrosPorCm,
                    Math.max(
                        metrosPorCm,
                        respuesta - metrosPorCm
                    )
                ]
            )
        );
    }

}


// ==========================================================
// 7. GUARDIANES DEL ORDEN
// Jerarquía de operaciones
// ==========================================================

function crearReactivoJerarquia(area) {

    const tipo = entero(1, 8);
    //const tipo = 9;


    // ------------------------------------------------------
    // Suma + multiplicación
    // ------------------------------------------------------

    if (tipo === 1) {

        const a = entero(2, 10);
        const b = entero(2, 8);
        const c = entero(2, 7);

        const resultado =
            a + b * c;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Resuelve respetando la jerarquía: $${a} + ${b} \\times ${c}$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    (a + b) * c,
                    a * b + c,
                    resultado + b
                ]
            )
        );
    }


    // ------------------------------------------------------
    // Paréntesis
    // ------------------------------------------------------

    if (tipo === 2) {

        const a = entero(2, 8);
        const b = entero(2, 8);
        const c = entero(2, 6);

        const resultado =
            (a + b) * c;

        return crearReactivoBase(
            area,
            'consola',
            `Resuelve: $(${a} + ${b}) \\times ${c}$`,
            resultado
        );
    }


    // ------------------------------------------------------
    // Exponente + multiplicación
    // ------------------------------------------------------

    if (tipo === 3) {

        const a = entero(2, 6);
        const b = entero(2, 5);
        const c = entero(1, 8);

        const resultado =
            a ** 2 + b * c;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `Resuelve: $${a}^{2} + ${b} \\times ${c}$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    (a * 2 + b) * c,
                    (a + b) * c,
                    a ** 2 + b + c
                ]
            )
        );
    }


    // ------------------------------------------------------
    // División y resta
    // ------------------------------------------------------

    if (tipo === 4) {

        const divisor = entero(2, 6);
        const cociente = entero(2, 8);
        const resta = entero(1, 9);

        const dividendo =
            divisor * cociente;

        const resultado =
            cociente - resta;

        return crearReactivoBase(
            area,
            'consola',
            `Resuelve: $${dividendo} \\div ${divisor} - ${resta}$`,
            resultado
        );
    }

    if (tipo === 5) {
        // ------------------------------------------------------
        // Reconocimiento de jerarquía
        // ------------------------------------------------------

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `¿Qué operación debe resolverse primero en $8 + 3 \\times (6 - 2)^2$?`,
            'La resta dentro del paréntesis',
            [
                'La suma 8 + 3',
                'La multiplicación 3 × (...)',
                'La resta dentro del paréntesis',
                'Elevar 2 al cuadrado'
            ]
        );
    }

    // ------------------------------------------------------
    // Símbolos de agrupación anidados
    // ------------------------------------------------------

    if (tipo === 6) {

        const a = entero(2, 8);
        const b = entero(2, 6);
        const c = entero(2, 5);
        const d = entero(1, 5);

        const resultado =
            a + b * (c + d);

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🏛️ Resuelve respetando los símbolos de agrupación:
            $\\{${a} + [${b} \\times (${c} + ${d})]\\}$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    (a + b) * (c + d),
                    a + b * c + d,
                    (a + b * c) + d
                ]
            )
        );
    }

    // ------------------------------------------------------
    // Resta como suma del opuesto
    // ------------------------------------------------------

    if (tipo === 7) {

        const a = entero(-8, 12);
        const b = entero(2, 9);

        const respuesta =
            `$(${a}) + (-${b})$`;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🪞 ¿Cuál expresión representa correctamente
            $(${a}) - (${b})$ como una <strong>suma con el opuesto</strong>?`,
            respuesta,
            [
                respuesta,
                `$(${a}) + (${b})$`,
                `$(-${a}) + (${b})$`,
                `$(-${a}) + (-${b})$`
            ]
        );
    }

    // ------------------------------------------------------
    // Operación combinada con raíz y números negativos
    // ------------------------------------------------------

    if (tipo === 8) {

        const raiz = entero(2, 7);
        const radicando =
            raiz ** 2;

        const negativo =
            entero(2, 6);

        const multiplicador =
            entero(2, 4);

        const resultado =
            raiz - (-negativo) * multiplicador;

        return crearReactivoBase(
            area,
            'opcion_multiple',
            `🗿 Resuelve respetando la jerarquía:
            $\\sqrt{${radicando}} - (-${negativo}) \\times ${multiplicador}$`,
            resultado,
            opcionesNumericas(
                resultado,
                [
                    raiz - negativo * multiplicador,
                    (raiz + negativo) * multiplicador,
                    raiz + negativo
                ]
            )
        );
    }

}