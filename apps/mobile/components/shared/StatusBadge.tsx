import React from 'react';
import Badge from '@/components/ui/Badge';

export default function StatusBadge({ status }: { status: string }) {
  return <Badge status={status} />;
}
