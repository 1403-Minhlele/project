const xss = require('xss');
const handleSecureContact = (req, res) => {
    if(!req.body.email || !req.body.message){
        return res.status(400).json({error: "Thiếu dữ liệu"});
    }

    const safeEmail = xss(req.body.mail);
    const safeMessage = xss(req.body.message);

    console.log(`[SECURE LOG] Message from: ${safeEmail}`);
    console.log(`[SECURE LOG] Content: ${safeMessage}`);

    return res.status(200).json({
        success: true,
        message: "[SECURE] Payload passed WAF & saved to server."
    });
};

module.exports = { handleSecureContact };