export const RECEIPT_PROCESSING_QUEUE_NAME = 'receipt-processing';
export const RECEIPT_PROCESSING_JOB_NAME = 'process-receipt';

export interface ReceiptProcessingJobData {
  submissionId: string;
}
