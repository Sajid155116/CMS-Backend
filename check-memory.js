// Run this after starting the app to check memory usage
const used = process.memoryUsage();

console.log('\n=== NestJS App Memory Usage ===');
for (let key in used) {
  console.log(`${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
}
console.log('===============================\n');

// RSS: Total memory allocated for the process
// HeapTotal: Total heap size
// HeapUsed: Actual memory used in heap
// External: C++ objects bound to JavaScript
