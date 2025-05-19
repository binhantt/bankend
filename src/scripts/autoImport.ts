import { CronJob } from 'cron';
import { importDataFromExcel } from './importFromExcel';
import path from 'path';

// Cấu hình thời gian chạy
// Chạy mỗi ngày lúc 00:00
const schedule = '0 0 * * *';

// Đường dẫn file Excel
const excelPath = path.resolve('D:\\duan\\data.xlsx');

// Hàm import dữ liệu
async function runImport() {
  console.log('Bắt đầu import dữ liệu tự động...');
  console.log('Thời gian:', new Date().toLocaleString());
  
  try {
    await importDataFromExcel(excelPath);
    console.log('Import tự động hoàn thành!');
  } catch (error) {
    console.error('Lỗi khi import tự động:', error);
  }
}

// Tạo job
const job = new CronJob(schedule, runImport);

// Chạy ngay lập tức lần đầu
console.log('Chạy import lần đầu ngay bây giờ...');
runImport().then(() => {
  // Sau khi chạy xong lần đầu, bắt đầu lịch
  console.log('Đã bật chế độ tự động import dữ liệu!');
  console.log(`Lịch chạy: ${schedule}`);
  console.log(`File Excel: ${excelPath}`);
  job.start();
});

// Giữ process chạy
process.on('SIGINT', () => {
  console.log('Đang dừng tự động import...');
  job.stop();
  process.exit();
}); 