"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ethers } from 'ethers';
import { useToast } from '@/components/ui/use-toast';
import { useContracts } from '@/hooks/useContract';

export function CreateJob() {
    const contracts = useContracts();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        payType: 0, // 0 for weekly, 1 for one-off
        weeklyPay: '',
        durationWeeks: '',
        totalPay: '',
        title: '',
        description: '',
        numPositions: '1'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        console.log('handle submit')
        e.preventDefault();
        if (!contracts || !contracts.jobFactory) {
            toast({
                title: "Error",
                description: "Please connect your wallet first",
                variant: "destructive"
            });
            return;
        }

        try {
            const weeklyPayWei = formData.payType === 0 ? ethers.parseEther(formData.weeklyPay) : BigInt(0);
            const durationWeeks = BigInt(formData.durationWeeks || '0');
            const totalPayWei = formData.payType === 1 ? ethers.parseEther(formData.totalPay) : BigInt(0);

            const value = formData.payType === 0
                ? weeklyPayWei * durationWeeks
                : totalPayWei;

            console.log('value', value, formData)

            const tx = await contracts.jobFactory.createJob(
                formData.payType,
                weeklyPayWei,
                durationWeeks,
                totalPayWei,
                formData.title,
                formData.description,
                formData.numPositions,
                { value }
            );

            toast({
                title: "Transaction Sent",
                description: "Please wait for confirmation...",
            });

            // The transaction object itself is a Promise that resolves when mined
            await tx.wait();

            toast({
                title: "Success",
                description: "Job created successfully!",
            });
        } catch (error) {
            console.error('Error: ', error);
            toast({
                title: "Error",
                description: "Failed to create job. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label>Payment Type</Label>
                <select
                    value={formData.payType}
                    onChange={(e) => setFormData(prev => ({ ...prev, payType: Number(e.target.value) }))}
                    className="w-full p-2 border rounded"
                >
                    <option value={0}>Weekly Payment</option>
                    <option value={1}>One-off Payment</option>
                </select>
            </div>

            {formData.payType === 0 ? (
                <>
                    <div>
                        <Label>Weekly Pay (KAS)</Label>
                        <Input
                            type="number"
                            value={formData.weeklyPay}
                            onChange={(e) => setFormData(prev => ({ ...prev, weeklyPay: e.target.value }))}
                            placeholder="0.0"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <Label>Duration (Weeks)</Label>
                        <Input
                            type="number"
                            value={formData.durationWeeks}
                            onChange={(e) => setFormData(prev => ({ ...prev, durationWeeks: e.target.value }))}
                            placeholder="1"
                            min="1"
                        />
                    </div>
                </>
            ) : (
                <div>
                    <Label>Total Pay (KAS)</Label>
                    <Input
                        type="number"
                        value={formData.totalPay}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalPay: e.target.value }))}
                        placeholder="0.0"
                        step="0.01"
                    />
                </div>
            )}

            <div>
                <Label>Job Title</Label>
                <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Senior Blockchain Developer"
                />
            </div>

            <div>
                <Label>Description</Label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Job description and requirements..."
                    className="w-full p-2 border rounded min-h-[100px]"
                />
            </div>

            <div>
                <Label>Number of Positions</Label>
                <Input
                    type="number"
                    value={formData.numPositions}
                    onChange={(e) => setFormData(prev => ({ ...prev, numPositions: e.target.value }))}
                    placeholder="1"
                    min="1"
                />
            </div>

            <Button type="submit" className="w-full">
                Create Job
            </Button>
        </form>
    );
} 
