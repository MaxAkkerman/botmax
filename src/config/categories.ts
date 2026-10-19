export type CategoryId =
  | 'milk'
  | 'logistics'
  | 'accounting'
  | 'complaints'
  | 'other';

export interface Category {
  id: CategoryId;
  label: string;
  detailsHint: string;
}

export const CATEGORIES: Category[] = [
  {
    id: 'milk',
    label: 'Покупка / Продажа молока',
    detailsHint:
      'Укажите объём, вид продукции, регион или другие детали по сделке.',
  },
  {
    id: 'logistics',
    label: 'Логистика и транспорт',
    detailsHint:
      'Укажите маршрут, даты, тип транспорта или другие логистические детали.',
  },
  {
    id: 'accounting',
    label: 'Бухгалтерия / Документы',
    detailsHint:
      'Укажите тип документов, период, ИНН/название организации или другие детали.',
  },
  {
    id: 'complaints',
    label: 'Жалобы и предложения',
    detailsHint:
      'Опишите ситуацию подробнее: дата, место, участники, желаемый результат.',
  },
  {
    id: 'other',
    label: 'Другое / Общий вопрос',
    detailsHint: 'Добавьте любую информацию, которая поможет быстрее ответить.',
  },
];

export function getCategoryById(id: CategoryId): Category {
  const category = CATEGORIES.find((item) => item.id === id);
  if (!category) {
    throw new Error(`Unknown category: ${id}`);
  }
  return category;
}

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORIES.some((category) => category.id === value);
}
