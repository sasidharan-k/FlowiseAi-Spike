import React from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

// Material
import {
    Stack,
    Chip,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    Dialog,
    DialogContent,
    DialogTitle,
    Paper,
    Button
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconVectorBezier2, IconMinimize } from '@tabler/icons-react'
import LLMIcon from '@mui/icons-material/ModelTraining'
import AlarmIcon from '@mui/icons-material/AlarmOn'
import TokensIcon from '@mui/icons-material/AutoAwesomeMotion'
import PaidIcon from '@mui/icons-material/Paid'

// Project imports
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'

// const
import { evaluators as evaluatorsOptions, numericOperators } from '../evaluators/evaluatorConstant'

const EvalsResultDialog = ({ show, dialogProps, onCancel, openDetailsDrawer }) => {
    const portalElement = document.getElementById('portal')
    const customization = useSelector((state) => state.customization)
    const theme = useTheme()
    const navigate = useNavigate()

    const component = show ? (
        <Dialog fullScreen open={show} onClose={onCancel} aria-labelledby='alert-dialog-title' aria-describedby='alert-dialog-description'>
            <DialogTitle id='alert-dialog-title'>
                <Stack direction='row' justifyContent={'space-between'}>
                    {dialogProps.data && dialogProps.data.evaluation.chatflowName?.length > 0 && (
                        <Stack flexDirection='row' sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div
                                style={{
                                    paddingLeft: '15px',
                                    paddingRight: '15px',
                                    paddingTop: '10px',
                                    paddingBottom: '10px',
                                    fontSize: '0.9rem',
                                    width: 'max-content',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center'
                                }}
                            >
                                <IconVectorBezier2 style={{ marginRight: 5 }} size={17} />
                                Chatflows Used:
                            </div>
                            {(dialogProps.data.evaluation.chatflowName || []).map((chatflowUsed, index) => (
                                <Chip
                                    key={index}
                                    clickable
                                    style={{
                                        width: 'max-content',
                                        borderRadius: '25px',
                                        boxShadow: customization.isDarkMode
                                            ? '0 2px 14px 0 rgb(255 255 255 / 10%)'
                                            : '0 2px 14px 0 rgb(32 40 45 / 10%)'
                                    }}
                                    label={chatflowUsed}
                                    onClick={() => navigate('/canvas/' + dialogProps.data.evaluation.chatflowId[index])}
                                ></Chip>
                            ))}
                        </Stack>
                    )}
                    <Button variant='outlined' sx={{ width: 'max-content' }} startIcon={<IconMinimize />} onClick={() => onCancel()}>
                        Minimize
                    </Button>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <TableContainer
                    sx={{
                        height: 'calc(100vh - 100px)',
                        marginTop: 1,
                        border: 1,
                        borderColor: theme.palette.grey[900] + 25,
                        borderRadius: 2
                    }}
                    component={Paper}
                >
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead
                            sx={{
                                backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                height: 56
                            }}
                        >
                            <TableRow>
                                <StyledTableCell>&nbsp;</StyledTableCell>
                                <StyledTableCell>Input</StyledTableCell>
                                <StyledTableCell>Expected Output</StyledTableCell>
                                {dialogProps.data &&
                                    dialogProps.data.evaluation.chatflowId?.map((_, index) => (
                                        <React.Fragment key={index}>
                                            {dialogProps.data.customEvalsDefined && dialogProps.data.showCustomEvals && (
                                                <StyledTableCell>
                                                    Evaluator
                                                    <br />({dialogProps.data.evaluation.chatflowName[index]})
                                                </StyledTableCell>
                                            )}
                                            <StyledTableCell>
                                                Actual Output
                                                <br />({dialogProps.data.evaluation.chatflowName[index]})
                                            </StyledTableCell>
                                            {dialogProps.data.evaluation?.evaluationType === 'llm' && (
                                                <StyledTableCell>LLM Evaluation</StyledTableCell>
                                            )}
                                        </React.Fragment>
                                    ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dialogProps.data &&
                                dialogProps.data.rows.length > 0 &&
                                dialogProps.data.rows.map((item, index) => (
                                    <StyledTableRow
                                        onClick={() => openDetailsDrawer(item)}
                                        hover
                                        key={index}
                                        sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <StyledTableCell sx={{ width: 2 }}>{index + 1}</StyledTableCell>
                                        <StyledTableCell sx={{ minWidth: '250px' }}>{item.input}</StyledTableCell>
                                        <StyledTableCell sx={{ minWidth: '250px' }}>{item.expectedOutput}</StyledTableCell>
                                        {dialogProps.data.evaluation.chatflowId?.map((_, index) => (
                                            <React.Fragment key={index}>
                                                {dialogProps.data.customEvalsDefined && dialogProps.data.showCustomEvals && (
                                                    <StyledTableCell>
                                                        {(item.customEvals[index] || []).map((evaluator, index) => (
                                                            <Stack
                                                                key={index}
                                                                sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}
                                                                flexDirection='row'
                                                                gap={1}
                                                            >
                                                                <Chip
                                                                    variant='contained'
                                                                    sx={{
                                                                        width: 'max-content',
                                                                        color: 'white',
                                                                        backgroundColor: evaluator.result === 'Pass' ? '#00c853' : '#ff1744'
                                                                    }}
                                                                    size='small'
                                                                    label={evaluator.result}
                                                                />
                                                                <Chip
                                                                    sx={{ width: 'max-content' }}
                                                                    variant='outlined'
                                                                    size='small'
                                                                    label={`Evaluator: ${evaluator.name}`}
                                                                ></Chip>
                                                                <Chip
                                                                    sx={{ width: 'max-content' }}
                                                                    variant='outlined'
                                                                    size='small'
                                                                    label={`${
                                                                        [...evaluatorsOptions, ...numericOperators].find(
                                                                            (opt) => opt.name === evaluator.measure
                                                                        )?.label || 'Actual Output'
                                                                    } ${[...evaluatorsOptions, ...numericOperators]
                                                                        .find((opt) => opt.name === evaluator.operator)
                                                                        ?.label.toLowerCase()} ${
                                                                        evaluator.type === 'text'
                                                                            ? '"' + evaluator.value + '"'
                                                                            : evaluator.value
                                                                    }`}
                                                                ></Chip>
                                                            </Stack>
                                                        ))}
                                                    </StyledTableCell>
                                                )}
                                                <StyledTableCell sx={{ minWidth: '350px' }}>
                                                    <Stack flexDirection='row' sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        {item.metrics[index]?.model && (
                                                            <Chip
                                                                variant='outlined'
                                                                icon={<LLMIcon />}
                                                                color={'info'}
                                                                size='small'
                                                                label={item.metrics[index]?.model}
                                                                sx={{ mr: 1, mb: 1 }}
                                                            />
                                                        )}
                                                        <Chip
                                                            variant='outlined'
                                                            size='small'
                                                            icon={<TokensIcon />}
                                                            label={
                                                                item.metrics[index]?.totalTokens
                                                                    ? 'Total Tokens: ' + item.metrics[index]?.totalTokens
                                                                    : 'Total Tokens: N/A'
                                                            }
                                                            sx={{ mr: 1, mb: 1 }}
                                                        />
                                                        {dialogProps.data && dialogProps.data.showTokenMetrics && (
                                                            <>
                                                                <Chip
                                                                    variant='outlined'
                                                                    size='small'
                                                                    icon={<TokensIcon />}
                                                                    label={
                                                                        item.metrics[index]?.promptTokens
                                                                            ? 'Prompt Tokens: ' + item.metrics[index]?.promptTokens
                                                                            : 'Prompt Tokens: N/A'
                                                                    }
                                                                    sx={{ mr: 1, mb: 1 }}
                                                                />{' '}
                                                                <Chip
                                                                    variant='outlined'
                                                                    size='small'
                                                                    icon={<TokensIcon />}
                                                                    label={
                                                                        item.metrics[index]?.completionTokens
                                                                            ? 'Completion Tokens: ' + item.metrics[index]?.completionTokens
                                                                            : 'Completion Tokens: N/A'
                                                                    }
                                                                    sx={{ mr: 1, mb: 1 }}
                                                                />{' '}
                                                            </>
                                                        )}
                                                        <Chip
                                                            variant='outlined'
                                                            size='small'
                                                            icon={<PaidIcon />}
                                                            label={
                                                                item.metrics[index]?.totalCost
                                                                    ? 'Total Cost: ' + item.metrics[index]?.totalCost
                                                                    : 'Total Cost: N/A'
                                                            }
                                                            sx={{ mr: 1, mb: 1 }}
                                                        />
                                                        {dialogProps.data && dialogProps.data.showCostMetrics && (
                                                            <>
                                                                <Chip
                                                                    variant='outlined'
                                                                    size='small'
                                                                    icon={<PaidIcon />}
                                                                    label={
                                                                        item.metrics[index]?.promptCost
                                                                            ? 'Prompt Cost: ' + item.metrics[index]?.promptCost
                                                                            : 'Prompt Cost: N/A'
                                                                    }
                                                                    sx={{ mr: 1, mb: 1 }}
                                                                />{' '}
                                                                <Chip
                                                                    variant='outlined'
                                                                    size='small'
                                                                    icon={<PaidIcon />}
                                                                    label={
                                                                        item.metrics[index]?.completionCost
                                                                            ? 'Completion Cost: ' + item.metrics[index]?.completionCost
                                                                            : 'Completion Cost: N/A'
                                                                    }
                                                                    sx={{ mr: 1, mb: 1 }}
                                                                />{' '}
                                                            </>
                                                        )}
                                                        <Chip
                                                            variant='outlined'
                                                            size='small'
                                                            icon={<AlarmIcon />}
                                                            label={
                                                                item.metrics[index]?.apiLatency
                                                                    ? 'API Latency: ' + item.metrics[index]?.apiLatency
                                                                    : 'API Latency: N/A'
                                                            }
                                                            sx={{ mr: 1, mb: 1 }}
                                                        />{' '}
                                                        {dialogProps.data && dialogProps.data.showLatencyMetrics && (
                                                            <>
                                                                {item.metrics[index]?.chain && (
                                                                    <Chip
                                                                        variant='outlined'
                                                                        size='small'
                                                                        icon={<AlarmIcon />}
                                                                        label={
                                                                            item.metrics[index]?.chain
                                                                                ? 'Chain Latency: ' + item.metrics[index]?.chain
                                                                                : 'Chain Latency: N/A'
                                                                        }
                                                                        sx={{ mr: 1, mb: 1 }}
                                                                    />
                                                                )}{' '}
                                                                {item.metrics[index]?.retriever && (
                                                                    <Chip
                                                                        variant='outlined'
                                                                        size='small'
                                                                        icon={<AlarmIcon />}
                                                                        sx={{ mr: 1, mb: 1 }}
                                                                        label={'Retriever Latency: ' + item.metrics[index]?.retriever}
                                                                    />
                                                                )}{' '}
                                                                {item.metrics[index]?.tool && (
                                                                    <Chip
                                                                        variant='outlined'
                                                                        size='small'
                                                                        icon={<AlarmIcon />}
                                                                        sx={{ mr: 1, mb: 1 }}
                                                                        label={'Tool Latency: ' + item.metrics[index]?.tool}
                                                                    />
                                                                )}{' '}
                                                                <Chip
                                                                    variant='outlined'
                                                                    size='small'
                                                                    icon={<AlarmIcon />}
                                                                    label={
                                                                        item.metrics[index]?.llm
                                                                            ? 'LLM Latency: ' + item.metrics[index]?.llm
                                                                            : 'LLM Latency: N/A'
                                                                    }
                                                                    sx={{ mr: 1, mb: 1 }}
                                                                />{' '}
                                                            </>
                                                        )}
                                                    </Stack>
                                                    {item.actualOutput[index]}
                                                </StyledTableCell>
                                                {dialogProps.data && dialogProps.data.evaluation?.evaluationType === 'llm' && (
                                                    <StyledTableCell sx={{ minWidth: '350px' }}>
                                                        {item.llmEvaluators[index] && (
                                                            <Stack
                                                                flexDirection='row'
                                                                gap={1}
                                                                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                                                            >
                                                                {Object.entries(item.llmEvaluators[index]).map(([key, value], index) => (
                                                                    <Chip
                                                                        key={index}
                                                                        variant='outlined'
                                                                        size='small'
                                                                        color={'primary'}
                                                                        sx={{
                                                                            height: 'auto',
                                                                            '& .MuiChip-label': {
                                                                                display: 'block',
                                                                                whiteSpace: 'normal'
                                                                            },
                                                                            p: 0.5
                                                                        }}
                                                                        label={
                                                                            <span>
                                                                                <b>{key}</b>: {value}
                                                                            </span>
                                                                        }
                                                                    />
                                                                ))}
                                                            </Stack>
                                                        )}
                                                    </StyledTableCell>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </StyledTableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

EvalsResultDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    openDetailsDrawer: PropTypes.func
}

export default EvalsResultDialog
