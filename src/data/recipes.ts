import type { ImageSourcePropType } from 'react-native';

export type Creator = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: string;
};

export type SocialRecipe = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  author: Creator;
  image: ImageSourcePropType;
  imageCredit?: string;
  video?: number;
  likes: number;
  comments: number;
  tags: string[];
  rawText: string;
};

export type RecipeComment = {
  id: string;
  recipeId: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  authorId?: string;
  authorHandle?: string;
  parentId?: string;
  likes?: number;
};

export type OwnProfile = {
  name: string;
  handle: string;
  bio: string;
  avatar: string;
};

export const demoRecipes: SocialRecipe[] = [
  {
    "id": "rigatoni-burrata",
    "title": "Rigatoni con tomate asado y burrata",
    "subtitle": "Tu nueva pasta favorita. Prometido.",
    "description": "Tomates dulces recién salidos del horno, una salsa que abraza la pasta y burrata cremosa para terminar. De esas recetas que repites sin pensarlo.",
    "author": {
      "id": "lucia.cocina",
      "name": "Lucía Martínez",
      "handle": "@lucia.cocina",
      "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
      "bio": "La vida sabe mejor hecha en casa. Pasta, sobremesas y un poquito de caos. 🍅",
      "followers": "24,8 mil"
    },
    "image": require('../../assets/rigatoni.webp'),
    "imageCredit": "Imagen creada para RECEPY con generación de imágenes.",
    "likes": 2480,
    "comments": 128,
    "tags": [
      "Pasta",
      "Vegetariano",
      "Hecho en casa"
    ],
    "rawText": "Rigatoni con tomate asado y burrata\n\nTomates dulces recién salidos del horno, una salsa que abraza la pasta y burrata cremosa para terminar. De esas recetas que repites sin pensarlo.\n\nPorciones: 2\nTiempo: 30 minutos\n\nIngredientes:\n- 200 g de rigatoni\n- 350 g de tomates cherry\n- 1 unidad de burrata\n- 3 dientes de ajo\n- 3 cucharadas de aceite de oliva\n- 8 hojas de albahaca fresca\n- 1 pizca de sal y pimienta\n\nPreparación:\n1. Asa los tomates. Precalienta el horno a 220 °C. Pon los tomates cherry y el ajo en una fuente con el aceite, sal y pimienta. Hornea durante 20 minutos, hasta que los tomates estén tiernos.\n2. Cuece el rigatoni. Lleva a ebullición abundante agua con sal. Cocina la pasta durante 10 minutos o según indique el paquete. Reserva una taza del agua de cocción y escurre.\n3. Une la pasta y la salsa. Aplasta los tomates y el ajo. Incorpora el rigatoni y un chorrito del agua reservada. Mezcla a fuego suave durante 2 minutos.\n4. Sirve y disfruta. Reparte la pasta en dos platos. Abre la burrata por encima y termina con albahaca fresca, pimienta y aceite de oliva."
  },
  {
    "id": "penne-cremoso-video",
    "title": "Penne cremoso, cero complicaciones",
    "subtitle": "La salsa que abraza cada bocado.",
    "description": "Un poco de mantequilla, nata y parmesano. Así de fácil es preparar una pasta cremosa que sabe a una cena especial, incluso entre semana.",
    "author": {
      "id": "lucia.cocina",
      "name": "Lucía Martínez",
      "handle": "@lucia.cocina",
      "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=85",
      "bio": "La vida sabe mejor hecha en casa. Pasta, sobremesas y un poquito de caos. 🍅",
      "followers": "24,8 mil"
    },
    "image": {
      "uri": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=85"
    },
    "imageCredit": "Fotografía de demostración de Unsplash.",
    "video": require('../../assets/cooking.mp4'),
    "likes": 1730,
    "comments": 64,
    "tags": [
      "Pasta",
      "Vegetariano",
      "En vídeo"
    ],
    "rawText": "Penne cremoso, cero complicaciones\n\nUn poco de mantequilla, nata y parmesano. Así de fácil es preparar una pasta cremosa que sabe a una cena especial, incluso entre semana.\n\nPorciones: 2\nTiempo: 20 minutos\n\nIngredientes:\n- 200 g de penne\n- 150 ml de nata para cocinar\n- 40 g de queso parmesano rallado\n- 20 g de mantequilla\n- 1 diente de ajo\n- 1 pizca de pimienta negra\n- 1 cucharada de perejil fresco\n- 1 pizca de sal\n\nPreparación:\n1. Cuece la pasta. Lleva a ebullición una olla con agua y sal. Cocina los penne durante 10 minutos o según indique el paquete. Reserva una taza del agua de cocción.\n2. Prepara la salsa cremosa. Derrite la mantequilla en una sartén a fuego suave. Añade el ajo picado y cocina 1 minuto. Incorpora la nata y calienta durante 2 minutos.\n3. Abraza la pasta. Vierte los penne en la salsa. Añade parmesano y unas cucharadas del agua reservada. Remueve a fuego bajo durante 3 minutos hasta que la salsa esté brillante.\n4. Termina a tu gusto. Reparte en dos platos. Añade pimienta negra, perejil fresco y un poco más de parmesano. Sirve enseguida."
  },
  {
    "id": "tacos-pollo",
    "title": "Tacos de pollo que sí pican rico",
    "subtitle": "Un viaje a México en cada mordida.",
    "description": "Pollo jugoso con especias, tortillas calientes y un pico de gallo que lo cambia todo. Perfectos para una cena de amigos.",
    "author": {
      "id": "mateo.al.fuego",
      "name": "Mateo Ríos",
      "handle": "@mateo.al.fuego",
      "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
      "bio": "Sabor de calle, cocina de casa. Desde Ciudad de México con mucho picante.",
      "followers": "18,2 mil"
    },
    "image": {
      "uri": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=85"
    },
    "imageCredit": "Fotografía de demostración de Unsplash.",
    "likes": 1860,
    "comments": 76,
    "tags": [
      "Mexicana",
      "Para compartir",
      "Picante"
    ],
    "rawText": "Tacos de pollo que sí pican rico\n\nPollo jugoso con especias, tortillas calientes y un pico de gallo que lo cambia todo. Perfectos para una cena de amigos.\n\nPorciones: 2\nTiempo: 25 minutos\n\nIngredientes:\n- 300 g de pechuga de pollo\n- 6 unidades de tortillas de maíz\n- 2 unidades de tomates\n- 0,5 unidad de cebolla morada\n- 2 unidades de limón\n- 1 puñado de cilantro\n- 1 cucharadita de comino y pimentón\n- 1 cucharada de aceite de oliva\n\nPreparación:\n1. Dale sabor al pollo. Corta la pechuga en tiras. Mezcla con comino, pimentón, aceite, sal y el zumo de un limón. Deja reposar durante 5 minutos.\n2. Prepara el pico de gallo. Pica los tomates, la cebolla y el cilantro. Mezcla con el otro limón y sal. Dedica unos 5 minutos a cortar y mezclar.\n3. El pollo al fuego. Calienta una sartén a fuego medio alto. Cocina las tiras de pollo durante 10 minutos, removiendo, hasta que estén completamente hechas en el centro.\n4. Monta y comparte. Calienta las tortillas, reparte el pollo y añade el pico de gallo. Sirve con gajos de limón y tu salsa favorita."
  },
  {
    "id": "bowl-verde",
    "title": "El bowl verde que apetece de verdad",
    "subtitle": "Fresco, crujiente y lleno de cosas buenas.",
    "description": "Quinoa, aguacate y verduras crujientes con una salsa de yogur y limón. La comida de mediodía que te alegra el lunes.",
    "author": {
      "id": "vera.green",
      "name": "Vera Green",
      "handle": "@vera.green",
      "avatar": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=85",
      "bio": "Más colores en tu plato. Recetas sencillas para comer bonito todos los días.",
      "followers": "12,6 mil"
    },
    "image": {
      "uri": "https://images.unsplash.com/photo-1511690078903-71dc5a49f5e3?auto=format&fit=crop&w=1200&q=85"
    },
    "imageCredit": "Fotografía de demostración de Unsplash.",
    "likes": 934,
    "comments": 42,
    "tags": [
      "Bowl",
      "Fresco",
      "Meal prep"
    ],
    "rawText": "El bowl verde que apetece de verdad\n\nQuinoa, aguacate y verduras crujientes con una salsa de yogur y limón. La comida de mediodía que te alegra el lunes.\n\nPorciones: 2\nTiempo: 20 minutos\n\nIngredientes:\n- 120 g de quinoa\n- 1 unidad de aguacate\n- 0,5 unidad de pepino\n- 200 g de garbanzos cocidos\n- 80 g de hojas verdes\n- 100 g de yogur natural\n- 1 unidad de limón\n- 1 cucharada de aceite de oliva\n\nPreparación:\n1. La base perfecta. Enjuaga la quinoa. Cuece con el doble de su volumen de agua y una pizca de sal durante 15 minutos. Retira del fuego y deja reposar tapada durante 5 minutos.\n2. Todo al natural. Lava las hojas verdes y el pepino. Corta el pepino en medias lunas y el aguacate en láminas. Escurre los garbanzos.\n3. Una salsa muy fácil. Mezcla el yogur con el zumo de medio limón, el aceite de oliva, sal y pimienta. Añade un poco de agua si prefieres una salsa ligera.\n4. Tu pequeño jardín. Reparte quinoa, hojas verdes, garbanzos, pepino y aguacate en dos boles. Termina con la salsa y ralladura de limón."
  },
  {
    "id": "pancakes-domingo",
    "title": "Pancakes para quedarse un ratito más",
    "subtitle": "Saben a domingo, aunque sea martes.",
    "description": "Esponjosos por dentro, dorados por fuera y con frutos rojos. La excusa perfecta para desayunar sin mirar el reloj.",
    "author": {
      "id": "dani.cocina",
      "name": "Dani & su cocina",
      "handle": "@dani.cocina",
      "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=85",
      "bio": "Desayunos de domingo y recetas para compartir. Aquí siempre cabe uno más.",
      "followers": "32,1 mil"
    },
    "image": {
      "uri": "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=1200&q=85"
    },
    "imageCredit": "Fotografía de demostración de Unsplash.",
    "likes": 3210,
    "comments": 164,
    "tags": [
      "Desayuno",
      "Dulce",
      "Para compartir"
    ],
    "rawText": "Pancakes para quedarse un ratito más\n\nEsponjosos por dentro, dorados por fuera y con frutos rojos. La excusa perfecta para desayunar sin mirar el reloj.\n\nPorciones: 2\nTiempo: 20 minutos\n\nIngredientes:\n- 150 g de harina de trigo\n- 180 ml de leche\n- 1 unidad de huevo\n- 1 cucharada de azúcar\n- 1 cucharadita de polvo de hornear\n- 25 g de mantequilla derretida\n- 100 g de frutos rojos\n- 2 cucharadas de sirope de arce\n\nPreparación:\n1. Los ingredientes secos. Mezcla la harina, el azúcar, el polvo de hornear y una pizca de sal en un bol. Remueve durante 1 minuto.\n2. Sin batir de más. Bate el huevo con la leche y la mantequilla templada. Añade a los ingredientes secos y mezcla solo hasta integrar. Deja reposar durante 3 minutos.\n3. La primera tanda. Calienta una sartén antiadherente a fuego medio bajo y engrasa ligeramente. Vierte porciones de masa. Gira cuando salgan burbujas y los bordes se vean firmes. Cocina todas las tandas durante unos 12 minutos en total.\n4. Una torre de felicidad. Apila los pancakes, añade los frutos rojos lavados y termina con sirope de arce. Sirve todavía calientes."
  },
  {
    "id": "smash-burger",
    "title": "Smash burger, bordes crujientes",
    "subtitle": "El secreto está en el primer aplastón.",
    "description": "Nuestra burger de casa: carne bien dorada, queso fundido, pan suave y una salsa de esas que quieres ponerle a todo.",
    "author": {
      "id": "casa.brasa",
      "name": "Casa Brasa",
      "handle": "@casa.brasa",
      "avatar": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=160&q=85",
      "bio": "Burgers de verdad, fuego lento y buenas conversaciones. Bogotá.",
      "followers": "8,4 mil"
    },
    "image": {
      "uri": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85"
    },
    "imageCredit": "Fotografía de demostración de Unsplash.",
    "likes": 4120,
    "comments": 201,
    "tags": [
      "Restaurante",
      "Burger",
      "Antojo"
    ],
    "rawText": "Smash burger, bordes crujientes\n\nNuestra burger de casa: carne bien dorada, queso fundido, pan suave y una salsa de esas que quieres ponerle a todo.\n\nPorciones: 2\nTiempo: 15 minutos\n\nIngredientes:\n- 300 g de carne de res molida\n- 2 unidades de panes de hamburguesa\n- 4 lonchas de queso cheddar\n- 4 unidades de pepinillos\n- 2 cucharadas de mayonesa\n- 1 cucharadita de mostaza\n- 1 cucharada de kétchup\n- 0,5 unidad de cebolla\n\nPreparación:\n1. La salsa de la casa. Mezcla mayonesa, mostaza y kétchup. Pica un pepinillo fino e incorpóralo a la salsa.\n2. Todo preparado. Divide la carne en cuatro bolas sin apretar demasiado. Corta la cebolla y los pepinillos en láminas. Tuesta el interior de los panes.\n3. Ese borde doradito. Calienta muy bien una sartén de hierro. Pon las bolas de carne y aplasta con una espátula resistente. Cocina durante unos 6 minutos en total: gira cuando se dore el primer lado, añade queso y termina hasta que la carne esté completamente hecha.\n4. Doble de felicidad. Unta salsa en ambos panes. Monta cada burger con dos carnes, cebolla y pepinillos. Cierra y sirve recién hecha."
  }
];

export const initialComments: RecipeComment[] = [
  {
    "id": "comment-1",
    "recipeId": "rigatoni-burrata",
    "author": "María López",
    "authorId": "maria.lopez",
    "authorHandle": "@maria.lopez",
    "likes": 12,
    "avatar": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=85",
    "text": "La hice ayer y no quedó ni un poquito. La burrata al final es otro nivel 🤌",
    "time": "Hace 2 h"
  },
  {
    "id": "comment-2",
    "recipeId": "rigatoni-burrata",
    "author": "Andrés Ruiz",
    "authorId": "andres.ruiz",
    "authorHandle": "@andres.ruiz",
    "likes": 5,
    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=85",
    "text": "Ese es el tipo de recetas por el que estoy aquí. Sencillo y con pintaza.",
    "time": "Hace 3 h"
  },
  {
    "id": "comment-3",
    "recipeId": "rigatoni-burrata",
    "author": "Sofía",
    "authorId": "sofia.cocina",
    "authorHandle": "@sofia.cocina",
    "likes": 3,
    "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=85",
    "text": "Guardada para la cena del viernes ❤️",
    "time": "Hace 4 h"
  }
];

export const ownDefault: OwnProfile = {
  "name": "Juan",
  "handle": "@juan.cocina",
  "bio": "Cocinando algo bueno. Un antojo a la vez. 🍅",
  "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=85"
};
