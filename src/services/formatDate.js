export const formatDate = (dateString) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  const date = new Date(dateString);

  // Date part
  const formattedDate = date.toLocaleDateString("en-US", options);

  // Time part
  let hour = date.getHours();
  const minutes = date.getMinutes();
  const period = hour >= 12 ? "PM" : "AM";

  // Convert 0 hours -> 12 AM, and 13-23 -> 1-11 PM
  hour = hour % 12 || 12;

  const formattedTime = `${hour}:${minutes.toString().padStart(2, "0")} ${period}`;

  return `${formattedDate} | ${formattedTime}`;
};
