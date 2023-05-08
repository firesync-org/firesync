export const randomUser = () => {
  return {
    name: [randomAdjective(), randomAnimal()].join(' '),
    color: `hsl(${Math.floor(Math.random() * 360)} 100% 30%)`
  }
}

function randomEntry<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)]
}

const randomAdjective = () =>
  randomEntry([
    'Bubbly',
    'Zany',
    'Spunky',
    'Quirky',
    'Wacky',
    'Whimsical',
    'Cheeky',
    'Silly',
    'Goofy',
    'Playful',
    'Zesty',
    'Jazzy',
    'Sassy',
    'Funky',
    'Dapper',
    'Groovy',
    'Snazzy',
    'Dashing',
    'Sprightly',
    'Peppy'
  ])

const randomAnimal = () =>
  randomEntry([
    'Narwhal',
    'Axolotl',
    'Pangolin',
    'Quokka',
    'Meerkat',
    'Fennec Fox',
    'Red Panda',
    'Sloth',
    'Llama',
    'Alpaca',
    'Capibara',
    'Hedgehog',
    'Kangaroo',
    'Platypus',
    'Otter',
    'Puma',
    'Toucan',
    'Wallaby',
    'Salamander',
    'Chinchilla'
  ])
