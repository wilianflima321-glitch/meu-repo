'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminPrimaryButton,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminStatusBanner,
  AdminTableStateRow,
} from '@/components/admin/AdminSurface';
import { adminJsonFetch } from '@/components/admin/adminAuthFetch';

type Dataset = {
  id: string;
  name: string;
  size: number;
  status: string;
  contentType?: string | null;
};

type Job = {
  id: string;
  status: string;
  epochs: number;
  learningRate: number;
  dataset?: Dataset;
  createdAt: string;
};

type DatasetsResponse = {
  items?: Dataset[];
};

type JobsResponse = {
  items?: Job[];
};

export default function FineTuningPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingDataset, setSavingDataset] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [datasetName, setDatasetName] = useState('');
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [epochs, setEpochs] = useState(5);
  const [learningRate, setLearningRate] = useState(0.001);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [datasetPayload, jobsPayload] = await Promise.all([
        adminJsonFetch<DatasetsResponse>('/api/admin/fine-tuning/datasets'),
        adminJsonFetch<JobsResponse>('/api/admin/fine-tuning/jobs'),
      ]);
      const datasetItems = Array.isArray(datasetPayload?.items) ? datasetPayload.items : [];
      setDatasets(datasetItems);
      setJobs(Array.isArray(jobsPayload?.items) ? jobsPayload.items : []);
      if (!selectedDataset && datasetItems.length > 0) {
        setSelectedDataset(datasetItems[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fine-tuning data');
    } finally {
      setLoading(false);
    }
  }, [selectedDataset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createDataset = useCallback(async () => {
    if (!datasetName.trim() || !datasetFile) {
      setError('Dataset name and file are required.');
      return;
    }

    try {
      setSavingDataset(true);
      const payload = await adminJsonFetch<{ uploadUrl?: string }>('/api/admin/fine-tuning/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: datasetName.trim(),
          size: datasetFile.size,
          contentType: datasetFile.type || 'application/octet-stream',
        }),
      });
      setMessage(payload?.uploadUrl ? 'Dataset registered. Upload URL generated.' : 'Dataset registered. Storage URL unavailable.');
      setDatasetName('');
      setDatasetFile(null);
      setError(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dataset');
    } finally {
      setSavingDataset(false);
    }
  }, [datasetFile, datasetName, fetchData]);

  const createJob = useCallback(async () => {
    if (!selectedDataset) {
      setError('Select a dataset first.');
      return;
    }

    try {
      setSavingJob(true);
      await adminJsonFetch('/api/admin/fine-tuning/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: selectedDataset,
          epochs,
          learningRate,
        }),
      });
      setMessage('Fine-tuning job queued.');
      setError(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fine-tuning job');
    } finally {
      setSavingJob(false);
    }
  }, [epochs, fetchData, learningRate, selectedDataset]);

  const pendingUploads = useMemo(() => datasets.filter((dataset) => dataset.status === 'pending_upload').length, [datasets]);

  return (
    <AdminPageShell
      title='Fine-Tuning'
      description='Manage training datasets and launch fine-tuning jobs with explicit queue visibility.'
      actions={<AdminPrimaryButton onClick={fetchData}>Refresh</AdminPrimaryButton>}
    >
      {error ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='danger'>{error}</AdminStatusBanner>
        </div>
      ) : null}
      {message ? (
        <div className='mb-4'>
          <AdminStatusBanner tone='success'>{message}</AdminStatusBanner>
        </div>
      ) : null}

      <div className='mb-6'>
        <AdminStatGrid>
          <AdminStatCard label='Datasets' value={datasets.length} tone='sky' />
          <AdminStatCard label='Pending Upload' value={pendingUploads} tone='amber' />
          <AdminStatCard label='Jobs' value={jobs.length} tone='neutral' />
          <AdminStatCard label='Running Jobs' value={jobs.filter((job) => job.status === 'running').length} tone='emerald' />
        </AdminStatGrid>
      </div>

      <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <AdminSection title='Register Dataset'>
          <div className='space-y-3'>
            <input
              value={datasetName}
              onChange={(event) => setDatasetName(event.target.value)}
              placeholder='Dataset name'
              className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            />
            <input
              type='file'
              onChange={(event) => setDatasetFile(event.target.files?.[0] ?? null)}
              className='w-full text-sm text-zinc-400 file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-zinc-200 hover:file:bg-zinc-700'
            />
            <div className='flex justify-end'>
              <AdminPrimaryButton onClick={createDataset} disabled={savingDataset}>
                {savingDataset ? 'Saving...' : 'Create dataset'}
              </AdminPrimaryButton>
            </div>
          </div>
        </AdminSection>

        <AdminSection title='Launch Fine-Tuning Job'>
          <div className='space-y-3'>
            <select
              value={selectedDataset}
              onChange={(event) => setSelectedDataset(event.target.value)}
              className='w-full rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
            >
              <option value=''>Select dataset</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
            <div className='grid grid-cols-2 gap-3'>
              <input
                type='number'
                min='1'
                value={epochs}
                onChange={(event) => setEpochs(Number(event.target.value) || 1)}
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
              />
              <input
                type='number'
                min='0.0001'
                step='0.0001'
                value={learningRate}
                onChange={(event) => setLearningRate(Number(event.target.value) || 0.001)}
                className='rounded border border-zinc-700 bg-zinc-950/60 p-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
              />
            </div>
            <div className='flex justify-end'>
              <AdminPrimaryButton onClick={createJob} disabled={savingJob}>
                {savingJob ? 'Queuing...' : 'Queue job'}
              </AdminPrimaryButton>
            </div>
          </div>
        </AdminSection>
      </div>

      <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
        <AdminSection title='Datasets' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Name</th>
                  <th className='p-3 text-left'>Size</th>
                  <th className='p-3 text-left'>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={3} message='Loading datasets...' />
                ) : datasets.length === 0 ? (
                  <AdminTableStateRow colSpan={3} message='No datasets available.' />
                ) : (
                  datasets.map((dataset) => (
                    <tr key={dataset.id} className='border-t border-zinc-800/70'>
                      <td className='p-3'>{dataset.name}</td>
                      <td className='p-3'>{(dataset.size / 1024 / 1024).toFixed(2)} MB</td>
                      <td className='p-3'>{dataset.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection title='Jobs' className='p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full table-auto text-sm'>
              <thead>
                <tr className='bg-zinc-800/70'>
                  <th className='p-3 text-left'>Dataset</th>
                  <th className='p-3 text-left'>Status</th>
                  <th className='p-3 text-left'>Epochs</th>
                  <th className='p-3 text-left'>LR</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <AdminTableStateRow colSpan={4} message='Loading jobs...' />
                ) : jobs.length === 0 ? (
                  <AdminTableStateRow colSpan={4} message='No jobs queued.' />
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className='border-t border-zinc-800/70'>
                      <td className='p-3'>{job.dataset?.name || '-'}</td>
                      <td className='p-3'>{job.status}</td>
                      <td className='p-3'>{job.epochs}</td>
                      <td className='p-3'>{job.learningRate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>
    </AdminPageShell>
  );
}
