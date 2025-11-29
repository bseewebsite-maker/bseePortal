import React, { useEffect } from 'react';

const MakeComGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    useEffect(() => {
        onClose();
    }, [onClose]);

    return null;
};
export default MakeComGuide;