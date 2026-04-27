// Тест логики распознавания username
// Запустите в консоли браузера на странице с расширением

console.log('=== Тест логики распознавания username ===\n');

// Тестовые данные
const testCases = [
  { value: '@test_user123', expected: true, description: 'Username с @' },
  { value: 'alice_2024', expected: true, description: 'Username без @' },
  { value: 'bob_jones', expected: true, description: 'Username с подчеркиванием' },
  { value: 'user123', expected: true, description: 'Username буквы+цифры' },
  { value: '123456789', expected: false, description: 'Просто число (ID)' },
  { value: 'GH949-62YW4-3RMM3', expected: true, description: 'Ключ с дефисами' },
  { value: 'ABCD1234', expected: true, description: 'Промокод' },
];

// Regex из кода
const usernameRegex = /^@?[A-Za-z0-9_-]{4,}$/;
const hasLettersRegex = /[A-Za-z]/;
const pureNumberRegex = /^\d+$/;
const keyRegex = /[A-Za-z0-9]+-[A-Za-z0-9]+/;

console.log('Проверка каждого значения:\n');

testCases.forEach(test => {
  const matchesUsername = usernameRegex.test(test.value);
  const hasLetters = hasLettersRegex.test(test.value);
  const isPureNumber = pureNumberRegex.test(test.value);
  const isKey = keyRegex.test(test.value);
  
  // Логика из кода: username должен соответствовать regex И содержать буквы
  const shouldCopy = (matchesUsername && hasLetters) || isKey;
  
  const status = shouldCopy === test.expected ? '✅' : '❌';
  
  console.log(`${status} "${test.value}" - ${test.description}`);
  console.log(`   Matches username regex: ${matchesUsername}`);
  console.log(`   Has letters: ${hasLetters}`);
  console.log(`   Is pure number: ${isPureNumber}`);
  console.log(`   Is key: ${isKey}`);
  console.log(`   Should copy: ${shouldCopy} (expected: ${test.expected})\n`);
});

console.log('\n=== Тест фильтрации массива ===\n');

// Симуляция foundValues с разными комбинациями
const scenarios = [
  {
    name: 'Username + ID',
    values: ['@test_user', '123456789'],
    expected: ['@test_user']
  },
  {
    name: 'Username без @ + ID',
    values: ['alice_2024', '987654321'],
    expected: ['alice_2024']
  },
  {
    name: 'Ключ + ID',
    values: ['GH949-62YW4-3RMM3-GQ4PT-7XHDZ', '1551509'],
    expected: ['GH949-62YW4-3RMM3-GQ4PT-7XHDZ']
  },
  {
    name: 'Только ID',
    values: ['123456789'],
    expected: ['123456789']
  },
  {
    name: 'Username + Ключ + ID',
    values: ['@user123', 'ABCD-1234-EFGH', '999888777'],
    expected: ['@user123', 'ABCD-1234-EFGH']
  }
];

scenarios.forEach(scenario => {
  console.log(`Сценарий: ${scenario.name}`);
  console.log(`Входные данные: [${scenario.values.map(v => `"${v}"`).join(', ')}]`);
  
  const foundValues = scenario.values;
  
  // Логика из кода
  const hasKeys = foundValues.some(v => /[A-Za-z0-9]+-[A-Za-z0-9]+/.test(v));
  const hasUsernames = foundValues.some(v => /^@?[A-Za-z0-9_-]{4,}$/.test(v) && !/^\d+$/.test(v));
  
  let valuesToCopy = foundValues;
  
  if (hasKeys || hasUsernames) {
    valuesToCopy = foundValues.filter(v => {
      if (/[A-Za-z0-9]+-[A-Za-z0-9]+/.test(v)) return true;
      if (/^@?[A-Za-z0-9_-]{4,}$/.test(v) && /[A-Za-z]/.test(v)) return true;
      return false;
    });
  }
  
  const match = JSON.stringify(valuesToCopy) === JSON.stringify(scenario.expected);
  const status = match ? '✅' : '❌';
  
  console.log(`${status} Результат: [${valuesToCopy.map(v => `"${v}"`).join(', ')}]`);
  console.log(`   Ожидалось: [${scenario.expected.map(v => `"${v}"`).join(', ')}]`);
  console.log(`   hasKeys: ${hasKeys}, hasUsernames: ${hasUsernames}\n`);
});

console.log('\n=== Тест завершён ===');
