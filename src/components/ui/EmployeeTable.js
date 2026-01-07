import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    Stack,
    Typography,
    Box
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';

const EmployeeTable = ({ 
    employees = [], 
    onEdit = null, 
    onDelete = null,
    onViewAccountDetails = null,
    showActions = false 
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    };

    const formatPhone = (phone) => {
        if (!phone) return 'N/A';
        return phone;
    };

    const getStatusColor = (status) => {
        status = (status || 'active').toLowerCase();
        switch (status) {
            case 'active':
                return 'success';
            case 'inactive':
                return 'error';
            case 'on leave':
                return 'error';
            default:
                return 'default';
        }
    };

    if (employees.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <Typography variant="h6">No employees found</Typography>
                <Typography variant="body2">No employees found for the selected department</Typography>
            </Box>
        );
    }

    return (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
            <Table sx={{ minWidth: 650 }} aria-label="employee table">
                <TableHead>
                    <TableRow>
                        <TableCell>Join Date</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Position</TableCell>
                        <TableCell>Status</TableCell>
                         <TableCell align="center">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {employees.map(employee => (
                        <TableRow
                            key={employee.id}
                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                            <TableCell>{formatDate(employee.joinDate || employee.join_date)}</TableCell>
                            <TableCell>
                                <Typography variant="body2">
                                    {employee.name || 'N/A'}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Stack spacing={1}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <EmailIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{employee.email || 'N/A'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PhoneIcon fontSize="small" color="action" />
                                        <Typography variant="body2">{formatPhone(employee.phone)}</Typography>
                                    </Box>
                                </Stack>
                            </TableCell>
                            <TableCell>
                                {employee.department || 'N/A'}
                                {/* <Chip
                                    label={employee.department || 'N/A'}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                /> */}
                            </TableCell>
                            <TableCell>{employee.position || 'N/A'}</TableCell>
                            <TableCell>
                                <Chip
                                    label={employee.status || 'Active'}
                                    size="small"
                                    color={getStatusColor(employee.status)}
                                />
                            </TableCell>
                            {/* {showActions && ( */}
                                <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent=" center">
                                        <IconButton
                                            size="small"
                                            onClick={() => onViewAccountDetails && onViewAccountDetails(employee)}
                                            color="info"
                                            title="View Account Details"
                                        >
                                            <AccountBalanceIcon fontSize="small" />
                                        </IconButton>
                                        {/* {onEdit && ( */}
                                            <IconButton
                                                size="small"
                                                onClick={() => onEdit(employee)}
                                                color="primary"
                                                title="Edit Employee"
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        {/* )} */}
                                        {/* {onDelete && ( */}
                                            <IconButton
                                                size="small"
                                                onClick={() => onDelete(employee)}
                                                color="error"
                                                title="Delete Employee"
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        {/* )} */}
                                    </Stack>
                                </TableCell>
                            {/* )} */}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default React.memo(EmployeeTable);