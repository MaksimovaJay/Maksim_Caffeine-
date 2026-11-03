/*
  ВЕСЬ КОНТЕНТ САЙТА — ЗДЕСЬ.

  Раздел (section):
    id        — часть ссылки: site.ru/#salfetnitsy откроет сразу этот раздел
    title     — большой заголовок
    navTitle  — (необязательно) короткое название для верхнего меню
    models    — список моделей

  Модель (model):
    name      — название (Essence, Status...). Можно не указывать — тогда будет только галерея
    shape     — вид схем: 'rounded' (скруглённые) или 'barrel' (бочкой, как Status)
    variants  — цены со схемами: { price: 600, scheme: 'one' | 'two' | 'three' }
    custom    — вместо variants: { note: ['просчет', 'индивидуальный'], price: '550–650' }
    photos    — пути к фото, например:
                ['images/1-salfetnitsy/essence/01.jpg', 'images/1-salfetnitsy/essence/02.jpg']
                Пока список пустой — показываются серые заглушки.
*/

window.SITE = {
  currency: 'сом',
  placeholderCount: 3,

  sections: [
    {
      id: 'salfetnitsy',
      title: 'Салфетницы',
      models: [
        {
          name: 'Essence',
          shape: 'rounded',
          variants: [
            { price: 600, scheme: 'one' },
            { price: 630, scheme: 'two' },
            { price: 650, scheme: 'three' },
          ],
          photos: [],
        },
        {
          name: 'Status',
          shape: 'barrel',
          variants: [
            { price: 600, scheme: 'one' },
            { price: 630, scheme: 'two' },
            { price: 650, scheme: 'three' },
          ],
          photos: [],
        },
        {
          name: 'Craft',
          custom: { note: ['просчет', 'индивидуальный'], price: '550–650' },
          photos: [],
        },
      ],
    },
    {
      id: 'chek-buki',
      title: 'Чек-буки',
      models: [{ photos: [] }],
    },
    {
      id: 'menu',
      title: 'Меню',
      models: [{ photos: [] }],
    },
    {
      id: 'reserv',
      title: 'Резерв',
      models: [{ photos: [] }],
    },
    {
      id: 'kuverty',
      title: 'Куверты',
      models: [{ photos: [] }],
    },
  ],
};
