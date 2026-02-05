import { Input, Button, Card, CardBody, Link, Tooltip, Progress, Select, SelectItem } from '@nextui-org/react';
import { INSTANCE_NAME_CONFIG_KEY } from '../../../utils/service_instance';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/api/shell';
import React, { useEffect, useState } from 'react';
import { Ollama } from 'ollama/browser';

import { useConfig } from '../../../hooks/useConfig';
import { useToastStyle } from '../../../hooks';
import { recognize } from './index';
import { Language } from './index';

// 识别模式对应的 Prompt
const RECOGNITION_MODES = {
    text: 'Text Recognition:',
    formula: 'Formula Recognition:',
    table: 'Table Recognition:',
};

export function Config(props) {
    const { instanceKey, updateServiceList, onClose } = props;
    const { t } = useTranslation();
    const [serviceConfig, setServiceConfig, getServiceConfig] = useConfig(
        instanceKey,
        {
            [INSTANCE_NAME_CONFIG_KEY]: t('services.recognize.ollama_ocr.title'),
            model: 'glm-ocr:latest',
            requestPath: 'http://localhost:11434',
            mode: 'text',
            prompt: 'Text Recognition:',
        },
        { sync: false }
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isPulling, setIsPulling] = useState(false);
    const [progress, setProgress] = useState(0);
    const [pullingStatus, setPullingStatus] = useState('');
    const [installedModels, setInstalledModels] = useState(null);

    const toastStyle = useToastStyle();

    async function getModels() {
        try {
            const ollama = new Ollama({ host: serviceConfig.requestPath });
            const list = await ollama.list();
            setInstalledModels(list);
        } catch {
            setInstalledModels(null);
        }
    }

    async function pullModel() {
        setIsPulling(true);
        const ollama = new Ollama({ host: serviceConfig.requestPath });
        const stream = await ollama.pull({ model: serviceConfig.model, stream: true });
        for await (const part of stream) {
            if (part.digest) {
                let percent = 0;
                if (part.completed && part.total) {
                    percent = Math.round((part.completed / part.total) * 100);
                }
                setProgress(percent);
                setPullingStatus(part.status);
            } else {
                setProgress(0);
                setPullingStatus(part.status);
            }
        }
        setProgress(0);
        setPullingStatus('');
        setIsPulling(false);
        getModels();
    }

    useEffect(() => {
        if (serviceConfig !== null) {
            getModels();
        }
    }, [serviceConfig]);

    return (
        serviceConfig !== null && (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setIsLoading(true);
                    // 获取当前最新的配置
                    const currentConfig = getServiceConfig();
                    // 测试用的 base64 图片 (包含 "test" 文字)
                    recognize(
                        'iVBORw0KGgoAAAANSUhEUgAAADsAAAAeCAYAAACSRGY2AAAAAXNSR0IArs4c6QAAArNJREFUWEftl19IU1Ecxz+O5uQiNTCJkNj0ZWhkSOyh7CEy0CWZQQoTWYgvk17KFAdr9GBBYGb/qD0oUpgSCZViGkTRQ/hwEVOYIIhlMF8kUjbGZGPFdGtrGvcWzTa79/Gec+79fb7fc36/38nQ6/Xf+E+eDAV2mzqdns6WtDNRqYP5UQ71D8i2RoGVLdW/mqg4K6287G3sqHtEdYEP8clrdpZXYdCCxzWE/dkHjp5poXa/AMEVZodvU+ea2/Dn0n2NnK8wYsgVQAWEAng+TfHiZTddy75NI83LtdBRfSS2xruIONKNNftccs9sFPbLkpqcXUCmei1At2uO3YU6CKnR7AhDLDJ204bdH4u/tKSdjkodmvCrEKz6A2iE9fWEVhAftmF1JwBnmxm0msjPinzHH2A1U42GFcSJZYzGJCaodVhYnRqgZngUCmw8rStC419gzOnA7iuio8HG8b3wccTC2clIkFkWhppPkKcK4H7bTev7cWbDQ5kHcZxqorpQAO8M929dp+eHPgJtNXepNajh6wx9j+9E3BeoONBCc7mOnCx18rJxFDYGYmbwson85Sm67nXSB9SXO7loFPCIDzj2anwtdOPhTpxlueB+h7W3BzF+w6pM9F8wYxACTPc30jAfHTTR22ymeMP78HicEMkqPX8Ku5kAMV6Ba/VOKvQJu4GIkCzx5sYlWuOOxE8CphcsbBQxjBOFXeD5VQftiekr2aUnOc4qsNvV2W12ZuVlYx9irxWrO82zMXLqbFz5WseVqLNlOnKyU7DOhkP/qx2Uysf05BLFJVvQQf1uUxHdmIY9Fq5UxfW5wQCezxK9sbYKx+mTGPMi/fRW9cbSd4rUnyH71pP6KNIRKrDSGqXnDMXZ9PRNOmrF2USNtFotXq+XYDAoLV8Kz5DlrAKbwg7+KrTvuhRWXxXeDuUAAAAASUVORK5CYII=',
                        Language.auto,
                        { config: currentConfig }
                    ).then(
                        () => {
                            setIsLoading(false);
                            // 使用最新的配置值进行保存
                            setServiceConfig(getServiceConfig(), true);
                            updateServiceList(instanceKey);
                            onClose();
                        },
                        (e) => {
                            setIsLoading(false);
                            toast.error(t('config.service.test_failed') + e.toString(), { style: toastStyle });
                        }
                    );
                }}
            >
                <Toaster />
                <div className='config-item'>
                    <Input
                        label={t('services.instance_name')}
                        labelPlacement='outside-left'
                        value={serviceConfig[INSTANCE_NAME_CONFIG_KEY]}
                        variant='bordered'
                        classNames={{
                            base: 'justify-between',
                            label: 'text-[length:--nextui-font-size-medium]',
                            mainWrapper: 'max-w-[50%]',
                        }}
                        onValueChange={(value) => {
                            setServiceConfig({
                                ...serviceConfig,
                                [INSTANCE_NAME_CONFIG_KEY]: value,
                            });
                        }}
                    />
                </div>
                {installedModels === null && (
                    <Card
                        isBlurred
                        className='border-none bg-danger/20 dark:bg-danger/10'
                        shadow='sm'
                    >
                        <CardBody>
                            <div>
                                {t('services.recognize.ollama_ocr.install_ollama')}
                                <br />
                                <Link
                                    isExternal
                                    href='https://ollama.com/download'
                                    color='primary'
                                >
                                    {t('services.recognize.ollama_ocr.install_ollama_link')}
                                </Link>
                            </div>
                        </CardBody>
                    </Card>
                )}
                <div className='config-item'>
                    <h3 className='my-auto'>{t('services.help')}</h3>
                    <Button
                        onPress={() => {
                            open('https://ollama.com/library');
                        }}
                    >
                        {t('services.help')}
                    </Button>
                </div>
                <div className='config-item'>
                    <Input
                        label={t('services.recognize.ollama_ocr.request_path')}
                        labelPlacement='outside-left'
                        value={serviceConfig['requestPath']}
                        variant='bordered'
                        classNames={{
                            base: 'justify-between',
                            label: 'text-[length:--nextui-font-size-medium]',
                            mainWrapper: 'max-w-[50%]',
                        }}
                        onValueChange={(value) => {
                            setServiceConfig({
                                ...serviceConfig,
                                requestPath: value,
                            });
                        }}
                    />
                </div>
                <div className='config-item'>
                    <Input
                        label={t('services.recognize.ollama_ocr.model')}
                        labelPlacement='outside-left'
                        value={serviceConfig['model']}
                        variant='bordered'
                        classNames={{
                            base: 'justify-between',
                            label: 'text-[length:--nextui-font-size-medium]',
                            mainWrapper: 'max-w-[50%]',
                        }}
                        onValueChange={(value) => {
                            setServiceConfig({
                                ...serviceConfig,
                                model: value,
                            });
                        }}
                        endContent={
                            installedModels &&
                                !installedModels.models
                                    .map((model) => {
                                        return model.name;
                                    })
                                    .includes(serviceConfig['model']) ? (
                                <Tooltip content={t('services.recognize.ollama_ocr.not_installed')}>
                                    <Button
                                        size='sm'
                                        variant='flat'
                                        color='warning'
                                        isLoading={isPulling}
                                        onPress={pullModel}
                                    >
                                        {t('services.recognize.ollama_ocr.install_model')}
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Button
                                    size='sm'
                                    variant='flat'
                                    color='success'
                                    disabled
                                >
                                    {t('services.recognize.ollama_ocr.ready')}
                                </Button>
                            )
                        }
                    />
                </div>
                <Card
                    isBlurred
                    className='border-none bg-success/20 dark:bg-success/10'
                    shadow='sm'
                >
                    <CardBody>
                        {isPulling && (
                            <Progress
                                size='sm'
                                radius='sm'
                                classNames={{
                                    base: 'max-w-md',
                                    track: 'drop-shadow-md border border-default',
                                    indicator: 'bg-gradient-to-r from-pink-500 to-yellow-500',
                                    label: 'tracking-wider font-medium text-default-600',
                                    value: 'text-foreground/60',
                                }}
                                label={pullingStatus}
                                value={progress}
                                showValueLabel={true}
                            />
                        )}
                        <div className='flex justify-center'>
                            <Link
                                isExternal
                                href='https://ollama.com/library'
                                color='primary'
                            >
                                {t('services.recognize.ollama_ocr.supported_models')}
                            </Link>
                        </div>
                    </CardBody>
                </Card>
                <div className='config-item'>
                    <Select
                        label={t('services.recognize.ollama_ocr.mode')}
                        labelPlacement='outside-left'
                        selectedKeys={[serviceConfig['mode']]}
                        variant='bordered'
                        classNames={{
                            base: 'justify-between',
                            label: 'text-[length:--nextui-font-size-medium]',
                            mainWrapper: 'max-w-[50%]',
                        }}
                        onSelectionChange={(keys) => {
                            const mode = Array.from(keys)[0];
                            setServiceConfig({
                                ...serviceConfig,
                                mode: mode,
                                prompt: RECOGNITION_MODES[mode],
                            });
                        }}
                    >
                        <SelectItem key='text'>{t('services.recognize.ollama_ocr.mode_text')}</SelectItem>
                        <SelectItem key='formula'>{t('services.recognize.ollama_ocr.mode_formula')}</SelectItem>
                        <SelectItem key='table'>{t('services.recognize.ollama_ocr.mode_table')}</SelectItem>
                    </Select>
                </div>
                <div className='config-item'>
                    <Input
                        label={t('services.recognize.ollama_ocr.prompt')}
                        labelPlacement='outside-left'
                        value={serviceConfig['prompt']}
                        variant='bordered'
                        classNames={{
                            base: 'justify-between',
                            label: 'text-[length:--nextui-font-size-medium]',
                            mainWrapper: 'max-w-[50%]',
                        }}
                        onValueChange={(value) => {
                            setServiceConfig({
                                ...serviceConfig,
                                prompt: value,
                            });
                        }}
                    />
                </div>
                <br />
                <Button
                    type='submit'
                    isLoading={isLoading}
                    fullWidth
                    color='primary'
                >
                    {t('common.save')}
                </Button>
            </form>
        )
    );
}
